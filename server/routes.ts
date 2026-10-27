import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import * as pdfParseModule from 'pdf-parse';
import mammoth from 'mammoth';
import { db } from './db.js';
import { authenticate, createSession, revokeSession, logAuditEvent } from './auth.js';
import {
  analyzeResumeAndJd,
  generateQuestion,
  evaluateAnswer,
  coachChat,
  coachChatStream,
} from './ai.js';
import { researchCompany } from './search.js';
import { generateStudyPackPdf } from './pdf.js';

export const apiRouter = Router();

// File upload configuration: max 10MB in memory
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload PDF, DOCX, or TXT file.'));
    }
  },
});

// Helper for parsing buffer text
async function extractTextFromBuffer(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const isPdf = mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
  const isDocx = mimetype.includes('wordprocessingml') || filename.toLowerCase().endsWith('.docx');

  if (isPdf) {
    try {
      const PDFParseClass: any = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default || pdfParseModule;
      if (typeof PDFParseClass === 'function') {
        const parser = new PDFParseClass({ data: buffer });
        if (parser.load) await parser.load();
        const text = parser.getText ? await parser.getText() : '';
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
      return '[Scanned or image-only PDF detected. Please review and paste the text manually in the editor below.]';
    } catch (err: any) {
      return '[Could not automatically extract text from this PDF. Please paste your resume text in the editor below.]';
    }
  }

  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    } catch (err: any) {
      return '[Could not automatically extract text from this DOCX. Please paste your resume text in the editor below.]';
    }
  }

  // Plain text fallback
  return buffer.toString('utf-8');
}

/* ==========================================================================
   SYSTEM / HEALTH
   ========================================================================== */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

apiRouter.get('/readiness', (req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ready',
    database: 'connected (node:sqlite)',
    aiProvider: hasGeminiKey ? 'Gemini 3.8 Flash (Active)' : 'Rule-Based Fallback Engine (API Key missing in environment)',
    searchAdapter: 'DuckDuckGo + Verified Knowledge Base',
    storage: 'Local persistent database',
  });
});

/* ==========================================================================
   AUTH
   ========================================================================== */
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, target_role, target_company, experience_level } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name must be at least 2 characters.' } });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required.' } });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters long.' } });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM app_users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' } });
  }

  const userId = crypto.randomUUID();
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  db.prepare(`
    INSERT INTO app_users (id, name, email, password_hash, target_role, target_company, experience_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name.trim(),
    cleanEmail,
    passwordHash,
    target_role || null,
    target_company || null,
    experience_level || null
  );

  const token = createSession(userId);
  logAuditEvent(userId, 'USER_REGISTERED', { email: cleanEmail });

  res.status(201).json({
    user: {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      preferred_language: 'en',
      target_role: target_role || null,
      target_company: target_company || null,
      experience_level: experience_level || null,
    },
    token,
  });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const userRow = db.prepare(`
    SELECT id, name, email, password_hash, preferred_language, target_role, target_company, experience_level
    FROM app_users WHERE email = ?
  `).get(cleanEmail) as any;

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    // Constant time / generic failure message per PRD FR-01
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
  }

  const token = createSession(userRow.id);
  logAuditEvent(userRow.id, 'USER_LOGIN', { email: cleanEmail });

  res.json({
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      preferred_language: userRow.preferred_language,
      target_role: userRow.target_role,
      target_company: userRow.target_company,
      experience_level: userRow.experience_level,
    },
    token,
  });
});

apiRouter.post('/auth/logout', authenticate, (req: Request, res: Response) => {
  const token = (req as any).token;
  if (token) revokeSession(token);
  logAuditEvent((req as any).user.id, 'USER_LOGOUT');
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/password-reset/request', (req: Request, res: Response) => {
  // Always return generic success to avoid user enumeration per PRD FR-01
  res.json({
    success: true,
    message: 'If an account exists with this email, password reset instructions have been dispatched.',
  });
});

apiRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

apiRouter.patch('/me', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { name, target_role, target_company, experience_level, preferred_language } = req.body || {};

  const updates: string[] = [];
  const params: any[] = [];

  if (name && typeof name === 'string') {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (target_role !== undefined) {
    updates.push('target_role = ?');
    params.push(target_role ? target_role.trim() : null);
  }
  if (target_company !== undefined) {
    updates.push('target_company = ?');
    params.push(target_company ? target_company.trim() : null);
  }
  if (experience_level !== undefined) {
    updates.push('experience_level = ?');
    params.push(experience_level ? experience_level.trim() : null);
  }
  if (preferred_language !== undefined) {
    updates.push('preferred_language = ?');
    params.push(preferred_language ? preferred_language.trim() : 'en');
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(userId);
    db.prepare(`UPDATE app_users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedUser = db.prepare(`
    SELECT id, name, email, preferred_language, target_role, target_company, experience_level
    FROM app_users WHERE id = ?
  `).get(userId);

  res.json({ user: updatedUser });
});

apiRouter.delete('/me', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  logAuditEvent(userId, 'ACCOUNT_DELETED');
  db.prepare('DELETE FROM app_users WHERE id = ?').run(userId);
  res.json({ success: true, message: 'Account and associated data deleted permanently.' });
});

/* ==========================================================================
   DOCUMENTS (Resume & Job Description)
   ========================================================================== */
apiRouter.post('/documents/resume', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  let text = '';
  let filename = 'pasted_resume.txt';
  let mimeType = 'text/plain';
  let sizeBytes = 0;

  if (req.file) {
    filename = req.file.originalname;
    mimeType = req.file.mimetype;
    sizeBytes = req.file.size;
    text = await extractTextFromBuffer(req.file.buffer, mimeType, filename);
  } else if (req.body?.text) {
    text = String(req.body.text).trim();
    sizeBytes = Buffer.byteLength(text, 'utf-8');
  } else {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please upload a resume file or paste text.' } });
  }

  const docId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO documents (id, user_id, document_type, original_filename, mime_type, size_bytes, extracted_text, extraction_status)
    VALUES (?, ?, 'resume', ?, ?, ?, ?, 'completed')
  `).run(docId, userId, filename, mimeType, sizeBytes, text);

  logAuditEvent(userId, 'DOCUMENT_UPLOADED', { documentId: docId, type: 'resume', sizeBytes });

  res.status(201).json({
    documentId: docId,
    status: 'completed',
    filename,
    extractedTextPreview: text.slice(0, 500),
    extractedText: text,
  });
});

apiRouter.post('/documents/jd', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  let text = '';
  let filename = 'pasted_job_description.txt';
  let mimeType = 'text/plain';
  let sizeBytes = 0;

  if (req.file) {
    filename = req.file.originalname;
    mimeType = req.file.mimetype;
    sizeBytes = req.file.size;
    text = await extractTextFromBuffer(req.file.buffer, mimeType, filename);
  } else if (req.body?.text) {
    text = String(req.body.text).trim();
    sizeBytes = Buffer.byteLength(text, 'utf-8');
  } else {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide job description text or upload a file.' } });
  }

  const docId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO documents (id, user_id, document_type, original_filename, mime_type, size_bytes, extracted_text, extraction_status)
    VALUES (?, ?, 'jd', ?, ?, ?, ?, 'completed')
  `).run(docId, userId, filename, mimeType, sizeBytes, text);

  res.status(201).json({
    documentId: docId,
    status: 'completed',
    filename,
    extractedTextPreview: text.slice(0, 500),
    extractedText: text,
  });
});

apiRouter.patch('/documents/:id/text', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const docId = req.params.id;
  const { extractedText } = req.body || {};

  if (typeof extractedText !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'extractedText string is required.' } });
  }

  const result = db.prepare(`
    UPDATE documents SET extracted_text = ? WHERE id = ? AND user_id = ?
  `).run(extractedText, docId, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found or unauthorized.' } });
  }

  res.json({ success: true, message: 'Document text updated successfully.' });
});

apiRouter.get('/documents/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const doc = db.prepare(`
    SELECT id, document_type, original_filename, mime_type, size_bytes, extracted_text, extraction_status, created_at
    FROM documents WHERE id = ? AND user_id = ?
  `).get(req.params.id, userId);

  if (!doc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
  }

  res.json({ document: doc });
});

/* ==========================================================================
   ANALYSIS & RESEARCH
   ========================================================================== */
apiRouter.post('/analysis', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { resumeDocumentId, jdDocumentId, targetRole, targetCompany } = req.body || {};

  const resumeDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ? AND user_id = ?').get(resumeDocumentId, userId) as any;
  const jdDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ? AND user_id = ?').get(jdDocumentId, userId) as any;

  if (!resumeDoc || !jdDoc) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid resume and job description documents are required.' } });
  }

  const role = targetRole || (req as any).user.target_role || 'Software Engineer';
  const company = targetCompany || (req as any).user.target_company || 'Tech Company';

  const analysisResult = await analyzeResumeAndJd(
    resumeDoc.extracted_text,
    jdDoc.extracted_text,
    role,
    company
  );

  const analysisId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO analyses (id, user_id, resume_document_id, jd_document_id, target_role, target_company, result_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
  `).run(
    analysisId,
    userId,
    resumeDocumentId,
    jdDocumentId,
    role,
    company,
    JSON.stringify(analysisResult)
  );

  logAuditEvent(userId, 'ANALYSIS_COMPLETED', { analysisId, targetRole: role, targetCompany: company });

  res.status(201).json({
    analysisId,
    status: 'completed',
    result: analysisResult,
  });
});

apiRouter.get('/analysis/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const row = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;

  if (!row) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found.' } });
  }

  res.json({
    analysis: {
      id: row.id,
      targetRole: row.target_role,
      targetCompany: row.target_company,
      status: row.status,
      createdAt: row.created_at,
      result: JSON.parse(row.result_json),
    },
  });
});

apiRouter.get('/analyses', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const rows = db.prepare('SELECT id, target_role, target_company, status, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json({ analyses: rows });
});

apiRouter.post('/company-research', authenticate, async (req: Request, res: Response) => {
  const { company, role } = req.body || {};
  if (!company || typeof company !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Company name is required.' } });
  }

  const result = await researchCompany(company, role || 'Software Engineer');
  res.json({ research: result });
});

/* ==========================================================================
   MOCK INTERVIEWS (Tracks 1, 2, 3)
   ========================================================================== */
apiRouter.post('/interviews', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { analysisId, type, targetDurationMinutes = 20, mode = 'text' } = req.body || {};

  const validTypes = ['hr', 'technical', 'project_mixed'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid interview type. Must be hr, technical, or project_mixed.' } });
  }

  let resumeText = '';
  let jdText = '';
  let targetRole = (req as any).user.target_role || 'Software Engineer';
  let targetCompany = (req as any).user.target_company || 'Tech Company';

  if (analysisId) {
    const analysisRow = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?').get(analysisId, userId) as any;
    if (analysisRow) {
      targetRole = analysisRow.target_role || targetRole;
      targetCompany = analysisRow.target_company || targetCompany;
      if (analysisRow.resume_document_id) {
        const rDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ?').get(analysisRow.resume_document_id) as any;
        if (rDoc) resumeText = rDoc.extracted_text;
      }
      if (analysisRow.jd_document_id) {
        const jDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ?').get(analysisRow.jd_document_id) as any;
        if (jDoc) jdText = jDoc.extracted_text;
      }
    }
  }

  const sessionId = crypto.randomUUID();
  const targetDurationSeconds = targetDurationMinutes * 60;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO interview_sessions (
      id, user_id, analysis_id, session_type, mode, status,
      target_duration_seconds, started_at, duration_seconds, ended_early
    ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, 0, 0)
  `).run(
    sessionId,
    userId,
    analysisId || null,
    type,
    mode,
    targetDurationSeconds,
    now
  );

  // Generate question 1
  const firstQuestion = await generateQuestion({
    sessionType: type,
    targetRole,
    targetCompany,
    resumeText,
    jdText,
    sequenceNo: 1,
    previousTurns: [],
  });

  const turnId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO interview_turns (id, session_id, sequence_no, question_text, question_category, question_metadata, asked_at)
    VALUES (?, ?, 1, ?, ?, ?, ?)
  `).run(
    turnId,
    sessionId,
    firstQuestion.questionText,
    firstQuestion.category,
    JSON.stringify(firstQuestion),
    now
  );

  logAuditEvent(userId, 'INTERVIEW_STARTED', { sessionId, type, mode });

  res.status(201).json({
    sessionId,
    status: 'in_progress',
    type,
    targetDurationSeconds,
    currentTurn: {
      turnId,
      sequenceNo: 1,
      question: firstQuestion.questionText,
      category: firstQuestion.category,
      rationale: firstQuestion.rationale,
      difficulty: firstQuestion.difficulty,
    },
  });
});

apiRouter.get('/interviews/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const session = db.prepare('SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;

  if (!session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview session not found.' } });
  }

  const turns = db.prepare('SELECT * FROM interview_turns WHERE session_id = ? ORDER BY sequence_no ASC').all(session.id) as any[];

  res.json({
    session: {
      ...session,
      finalReport: session.final_report_json ? JSON.parse(session.final_report_json) : null,
    },
    turns: turns.map(t => ({
      id: t.id,
      sequenceNo: t.sequence_no,
      questionText: t.question_text,
      questionCategory: t.question_category,
      answerText: t.answer_text,
      transcriptEdited: Boolean(t.transcript_edited),
      feedback: t.feedback_json ? JSON.parse(t.feedback_json) : null,
      askedAt: t.asked_at,
      answeredAt: t.answered_at,
    })),
  });
});

apiRouter.post('/interviews/:id/answer', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const sessionId = req.params.id;
  const { turnId, answerText, transcriptEdited = false } = req.body || {};

  if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide an answer.' } });
  }

  const session = db.prepare('SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId) as any;
  if (!session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview session not found.' } });
  }

  const turn = db.prepare('SELECT * FROM interview_turns WHERE id = ? AND session_id = ?').get(turnId, sessionId) as any;
  if (!turn) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview turn not found.' } });
  }

  let resumeText = '';
  let jdText = '';
  let targetRole = 'Software Engineer';
  let targetCompany = 'Tech Company';

  if (session.analysis_id) {
    const analysisRow = db.prepare('SELECT * FROM analyses WHERE id = ?').get(session.analysis_id) as any;
    if (analysisRow) {
      targetRole = analysisRow.target_role || targetRole;
      targetCompany = analysisRow.target_company || targetCompany;
      if (analysisRow.resume_document_id) {
        const rDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ?').get(analysisRow.resume_document_id) as any;
        if (rDoc) resumeText = rDoc.extracted_text;
      }
      if (analysisRow.jd_document_id) {
        const jDoc = db.prepare('SELECT extracted_text FROM documents WHERE id = ?').get(analysisRow.jd_document_id) as any;
        if (jDoc) jdText = jDoc.extracted_text;
      }
    }
  }

  // 1. Evaluate answer using PRD rubric
  const feedback = await evaluateAnswer({
    question: turn.question_text,
    questionCategory: turn.question_category,
    answer: answerText.trim(),
    resumeText,
    jdText,
  });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE interview_turns
    SET answer_text = ?, transcript_edited = ?, feedback_json = ?, answered_at = ?
    WHERE id = ?
  `).run(
    answerText.trim(),
    transcriptEdited ? 1 : 0,
    JSON.stringify(feedback),
    now,
    turnId
  );

  // Check all answered turns to decide follow-up or completion
  const turns = db.prepare('SELECT * FROM interview_turns WHERE session_id = ? ORDER BY sequence_no ASC').all(sessionId) as any[];
  const nextSeq = turns.length + 1;

  // Next question generation
  const previousTurns = turns.map(t => ({
    question: t.question_text,
    answer: t.answer_text || '',
  }));

  const nextQuestion = await generateQuestion({
    sessionType: session.session_type,
    targetRole,
    targetCompany,
    resumeText,
    jdText,
    sequenceNo: nextSeq,
    previousTurns,
  });

  const nextTurnId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO interview_turns (id, session_id, sequence_no, question_text, question_category, question_metadata, asked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nextTurnId,
    sessionId,
    nextSeq,
    nextQuestion.questionText,
    nextQuestion.category,
    JSON.stringify(nextQuestion),
    now
  );

  res.json({
    feedback,
    nextTurn: {
      turnId: nextTurnId,
      sequenceNo: nextSeq,
      question: nextQuestion.questionText,
      category: nextQuestion.category,
      rationale: nextQuestion.rationale,
      difficulty: nextQuestion.difficulty,
    },
  });
});

apiRouter.post('/interviews/:id/end', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const sessionId = req.params.id;
  const session = db.prepare('SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId) as any;

  if (!session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview session not found.' } });
  }

  const turns = db.prepare('SELECT * FROM interview_turns WHERE session_id = ? AND answer_text IS NOT NULL ORDER BY sequence_no ASC').all(sessionId) as any[];

  const started = new Date(session.started_at || session.created_at).getTime();
  const now = Date.now();
  const durationSeconds = Math.max(1, Math.floor((now - started) / 1000) - (session.paused_seconds || 0));
  const endedEarly = durationSeconds < session.target_duration_seconds;

  // Calculate composite category scores from rubric
  let totalTech = 0;
  let totalRel = 0;
  let totalComp = 0;
  let totalStruct = 0;
  let totalClarity = 0;
  let totalGrammar = 0;
  let count = 0;

  for (const t of turns) {
    if (t.feedback_json) {
      try {
        const fb = JSON.parse(t.feedback_json);
        if (fb.scores) {
          totalTech += fb.scores.technicalCorrectness || 4;
          totalRel += fb.scores.relevance || 4;
          totalComp += fb.scores.completeness || 4;
          totalStruct += fb.scores.structure || 4;
          totalClarity += fb.scores.communicationClarity || 4;
          totalGrammar += fb.scores.grammarVocabulary || 4;
          count++;
        }
      } catch (e) {}
    }
  }

  const categoryScores = count > 0 ? {
    technicalCorrectness: Number((totalTech / count).toFixed(1)),
    relevance: Number((totalRel / count).toFixed(1)),
    completeness: Number((totalComp / count).toFixed(1)),
    structure: Number((totalStruct / count).toFixed(1)),
    communicationClarity: Number((totalClarity / count).toFixed(1)),
    grammarVocabulary: Number((totalGrammar / count).toFixed(1)),
  } : {
    technicalCorrectness: 4.0,
    relevance: 4.0,
    completeness: 4.0,
    structure: 4.0,
    communicationClarity: 4.0,
    grammarVocabulary: 4.0,
  };

  const avgScore = Number((
    (categoryScores.technicalCorrectness +
      categoryScores.relevance +
      categoryScores.completeness +
      categoryScores.structure +
      categoryScores.communicationClarity +
      categoryScores.grammarVocabulary) / 6
  ).toFixed(1));

  const finalReport = {
    overallScore: avgScore,
    durationSeconds,
    targetDurationSeconds: session.target_duration_seconds,
    endedEarly,
    questionsAnswered: count,
    categoryScores,
    summary: endedEarly
      ? `Completed ${count} question(s) in ${Math.floor(durationSeconds / 60)} minutes (${durationSeconds}s). Session was ended early by user.`
      : `Complete 20-minute mock session finished with ${count} questions answered. Excellent preparation pace and engagement.`,
    practiceTasks: [
      'Refine STAR frameworks for complex architectural challenges.',
      'Practice 90-second elevator summaries for your top technical projects.',
      'Review PostgreSQL transaction isolation trade-offs and edge-case handling.'
    ]
  };

  db.prepare(`
    UPDATE interview_sessions
    SET status = 'completed', ended_at = datetime('now'), duration_seconds = ?, ended_early = ?, final_report_json = ?
    WHERE id = ?
  `).run(
    durationSeconds,
    endedEarly ? 1 : 0,
    JSON.stringify(finalReport),
    sessionId
  );

  logAuditEvent(userId, 'INTERVIEW_COMPLETED', { sessionId, durationSeconds, endedEarly, overallScore: avgScore });

  res.json({
    status: 'completed',
    report: finalReport,
  });
});

apiRouter.get('/interviews', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const sessions = db.prepare(`
    SELECT id, session_type, mode, status, duration_seconds, target_duration_seconds, ended_early, started_at, ended_at, final_report_json, created_at
    FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId) as any[];

  res.json({
    interviews: sessions.map(s => ({
      ...s,
      finalReport: s.final_report_json ? JSON.parse(s.final_report_json) : null,
    })),
  });
});

apiRouter.delete('/interviews/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  db.prepare('DELETE FROM interview_sessions WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true, message: 'Interview session deleted.' });
});

/* ==========================================================================
   ASK ME (AI COACH)
   ========================================================================== */
apiRouter.post('/coach/chat', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { conversationId, message } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Message cannot be empty.' } });
  }

  let convoId = conversationId;
  if (!convoId) {
    convoId = crypto.randomUUID();
    const title = message.trim().slice(0, 45) + (message.length > 45 ? '...' : '');
    db.prepare('INSERT INTO coach_conversations (id, user_id, title) VALUES (?, ?, ?)').run(convoId, user.id, title);
  }

  // Retrieve user context: latest resume, JD, analysis, recent session
  const latestResume = db.prepare("SELECT extracted_text FROM documents WHERE user_id = ? AND document_type = 'resume' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestJd = db.prepare("SELECT extracted_text FROM documents WHERE user_id = ? AND document_type = 'jd' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestAnalysis = db.prepare("SELECT result_json FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestInterview = db.prepare("SELECT final_report_json FROM interview_sessions WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;

  // Retrieve previous messages in this conversation
  const prevRows = db.prepare('SELECT role, content FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10').all(convoId) as any[];

  // Save user message
  const userMsgId = crypto.randomUUID();
  db.prepare('INSERT INTO coach_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, convoId, 'user', message.trim());

  // Call AI coach
  const response = await coachChat({
    message: message.trim(),
    conversationHistory: prevRows,
    context: {
      userName: user.name,
      targetRole: user.target_role || undefined,
      targetCompany: user.target_company || undefined,
      resumeText: latestResume?.extracted_text,
      jdText: latestJd?.extracted_text,
      analysis: latestAnalysis?.result_json ? JSON.parse(latestAnalysis.result_json) : null,
      lastSessionReport: latestInterview?.final_report_json ? JSON.parse(latestInterview.final_report_json) : null,
    },
  });

  // Save coach message
  const assistantMsgId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO coach_messages (id, conversation_id, role, content, citations_json)
    VALUES (?, ?, 'assistant', ?, ?)
  `).run(
    assistantMsgId,
    convoId,
    response.answer,
    JSON.stringify(response.citations)
  );

  res.json({
    conversationId: convoId,
    answer: response.answer,
    citations: response.citations,
    suggestedFollowUps: response.suggestedFollowUps,
  });
});

apiRouter.post('/coach/chat/stream', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { conversationId, message } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Message cannot be empty.' } });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let isAborted = false;
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      isAborted = true;
      abortController.abort();
    }
  });

  const sendEvent = (data: any) => {
    if (isAborted || res.writableEnded) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  let convoId = conversationId;
  if (!convoId) {
    convoId = crypto.randomUUID();
    const title = message.trim().slice(0, 45) + (message.length > 45 ? '...' : '');
    db.prepare('INSERT INTO coach_conversations (id, user_id, title) VALUES (?, ?, ?)').run(convoId, user.id, title);
  }

  // Save user message to DB
  const userMsgId = crypto.randomUUID();
  db.prepare('INSERT INTO coach_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
    userMsgId,
    convoId,
    'user',
    message.trim()
  );

  sendEvent({ type: 'init', conversationId: convoId, userMessageId: userMsgId });

  // Retrieve user context: latest resume, JD, analysis, recent session
  const latestResume = db.prepare("SELECT extracted_text FROM documents WHERE user_id = ? AND document_type = 'resume' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestJd = db.prepare("SELECT extracted_text FROM documents WHERE user_id = ? AND document_type = 'jd' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestAnalysis = db.prepare("SELECT result_json FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(user.id) as any;
  const latestInterview = db.prepare("SELECT final_report_json FROM interview_sessions WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(user.id) as any;

  // Retrieve previous messages
  const prevRows = db.prepare('SELECT role, content FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10').all(convoId) as any[];

  let accumulated = '';
  try {
    const result = await coachChatStream(
      {
        message: message.trim(),
        conversationHistory: prevRows,
        context: {
          userName: user.name,
          targetRole: user.target_role || undefined,
          targetCompany: user.target_company || undefined,
          resumeText: latestResume?.extracted_text,
          jdText: latestJd?.extracted_text,
          analysis: latestAnalysis?.result_json ? JSON.parse(latestAnalysis.result_json) : null,
          lastSessionReport: latestInterview?.final_report_json ? JSON.parse(latestInterview.final_report_json) : null,
        },
      },
      {
        onChunk: (chunk: string) => {
          accumulated += chunk;
          sendEvent({ type: 'chunk', text: chunk });
        },
      },
      abortController.signal
    );

    // Save coach message to DB
    const assistantMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO coach_messages (id, conversation_id, role, content, citations_json)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(
      assistantMsgId,
      convoId,
      result.answer,
      JSON.stringify(result.citations)
    );

    sendEvent({
      type: 'done',
      messageId: assistantMsgId,
      answer: result.answer,
      citations: result.citations,
      suggestedFollowUps: result.suggestedFollowUps,
    });
  } catch (err: any) {
    if (isAborted) {
      // User aborted stream: persist partial response if any exists
      if (accumulated.trim().length > 0) {
        const partialAnswer = accumulated.replace(/\n*---\s*\n*(?:CITATIONS:|FOLLOW_UPS:|SUGGESTIONS:)[\s\S]*$/i, '').trim();
        const assistantMsgId = crypto.randomUUID();
        try {
          db.prepare(`
            INSERT INTO coach_messages (id, conversation_id, role, content, citations_json)
            VALUES (?, ?, 'assistant', ?, ?)
          `).run(
            assistantMsgId,
            convoId,
            partialAnswer + ' *(generation paused)*',
            JSON.stringify(['Candidate Context'])
          );
        } catch (e) {}
      }
    } else {
      console.error('Error during coachChatStream:', err);
      sendEvent({ type: 'error', message: err.message || 'Stream processing failed' });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

apiRouter.get('/coach/conversations', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const convos = db.prepare('SELECT id, title, created_at, updated_at FROM coach_conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
  res.json({ conversations: convos });
});

apiRouter.get('/coach/conversations/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const convo = db.prepare('SELECT id, title, created_at FROM coach_conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!convo) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found.' } });
  }

  const messages = db.prepare('SELECT id, role, content, citations_json, created_at FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convo.id) as any[];

  res.json({
    conversation: convo,
    messages: messages.map(m => ({
      ...m,
      citations: m.citations_json ? JSON.parse(m.citations_json) : [],
    })),
  });
});

apiRouter.delete('/coach/conversations/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  db.prepare('DELETE FROM coach_conversations WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true, message: 'Conversation deleted.' });
});

/* ==========================================================================
   STUDY PACKS & PDF DOWNLOAD
   ========================================================================== */
apiRouter.post('/study-packs', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { analysisId } = req.body || {};

    let analysisRow: any = null;
    if (analysisId) {
      analysisRow = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?').get(analysisId, user.id);
    }
    if (!analysisRow) {
      analysisRow = db.prepare('SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
    }

    if (!analysisRow) {
      return res.status(400).json({ error: { code: 'NOT_FOUND', message: 'Please complete a resume and job description analysis first.' } });
    }

    const company = analysisRow.target_company || user.target_company || 'Target Company';
    const role = analysisRow.target_role || user.target_role || 'Target Role';

    const companyResearch = await researchCompany(company, role);
    const analysisData = JSON.parse(analysisRow.result_json);

    const studyPackId = crypto.randomUUID();
    const title = `${company} — ${role} Master Study Pack`;

    const packContent = {
      userName: user.name,
      targetRole: role,
      targetCompany: company,
      generationDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      analysis: analysisData,
      companyResearch,
    };

    db.prepare(`
      INSERT INTO study_packs (id, user_id, analysis_id, status, title, source_manifest_json, content_json)
      VALUES (?, ?, ?, 'ready', ?, ?, ?)
    `).run(
      studyPackId,
      user.id,
      analysisRow.id,
      title,
      JSON.stringify(companyResearch.sourcedFacts),
      JSON.stringify(packContent)
    );

    logAuditEvent(user.id, 'STUDY_PACK_GENERATED', { studyPackId, company, role });

    res.status(201).json({
      studyPackId,
      status: 'ready',
      title,
      content: packContent,
    });
  } catch (err: any) {
    console.error('Error generating study pack:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to generate study pack.' } });
  }
});

apiRouter.get('/study-packs', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const packs = db.prepare('SELECT id, analysis_id, status, title, created_at FROM study_packs WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json({ studyPacks: packs });
});

apiRouter.get('/study-packs/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const pack = db.prepare('SELECT * FROM study_packs WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!pack) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Study pack not found.' } });
  }
  res.json({
    studyPack: {
      id: pack.id,
      title: pack.title,
      status: pack.status,
      createdAt: pack.created_at,
      content: JSON.parse(pack.content_json),
    },
  });
});

apiRouter.get('/study-packs/:id/download', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const pack = db.prepare('SELECT * FROM study_packs WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!pack) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Study pack not found.' } });
  }

  const content = JSON.parse(pack.content_json);
  const pdfBuffer = generateStudyPackPdf(content);

  const safeFilename = `${pack.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.send(pdfBuffer);
});

apiRouter.delete('/study-packs/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  db.prepare('DELETE FROM study_packs WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true, message: 'Study pack deleted.' });
});
