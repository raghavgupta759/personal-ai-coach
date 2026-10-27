import { jsPDF } from 'jspdf';
import type { CompanyResearchResult } from './search.js';
import type { AnalysisOutput } from './ai.js';

export interface StudyPackData {
  userName: string;
  targetRole: string;
  targetCompany: string;
  generationDate: string;
  analysis: AnalysisOutput;
  companyResearch: CompanyResearchResult;
}

export function generateStudyPackPdf(data: StudyPackData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 30) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  }

  function drawHeader() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 170);
    doc.text(`PERSONAL AI COACH — PERSONALIZED INTERVIEW STUDY PACK`, margin, margin - 15);
    doc.text(`${data.targetCompany} • ${data.targetRole}`, pageWidth - margin, margin - 15, { align: 'right' });
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, margin - 8, pageWidth - margin, margin - 8);
  }

  function drawSectionTitle(title: string) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(title, margin, y + 16);
    y += 24;
    doc.setDrawColor(139, 92, 246); // violet-500
    doc.setLineWidth(1.5);
    doc.line(margin, y - 2, margin + 40, y - 2);
    y += 8;
  }

  // Cover / Header Banner
  drawHeader();

  // Top Title Card
  doc.setFillColor(18, 26, 43); // slate-900
  doc.roundedRect(margin, y, contentWidth, 75, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(244, 247, 251);
  doc.text(`Personal AI Coach — Interview Study Pack`, margin + 16, y + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(34, 211, 238); // cyan-400
  doc.text(`Candidate: ${data.userName}  |  Target Role: ${data.targetRole}  |  Company: ${data.targetCompany}`, margin + 16, y + 48);
  doc.setTextColor(168, 179, 199);
  doc.text(`Generated: ${data.generationDate}  |  Match Score: ${data.analysis.overallMatchScore}%`, margin + 16, y + 64);
  y += 90;

  // 1. Company Overview & Sourced Facts
  drawSectionTitle('1. Company Overview & Sourced Public Research');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const overviewLines = doc.splitTextToSize(data.companyResearch.overview, contentWidth);
  doc.text(overviewLines, margin, y);
  y += overviewLines.length * 13 + 8;

  if (data.companyResearch.cultureAndValues.length > 0) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Values & Culture Signals:', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.companyResearch.cultureAndValues.forEach((val) => {
      checkPageBreak(20);
      const valLines = doc.splitTextToSize(`• ${val}`, contentWidth - 10);
      doc.text(valLines, margin + 8, y);
      y += valLines.length * 12 + 4;
    });
    y += 6;
  }

  if (data.companyResearch.sourcedFacts.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Verified Public Citations & References:', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    data.companyResearch.sourcedFacts.forEach((fact) => {
      checkPageBreak(30);
      doc.setTextColor(71, 85, 105);
      const factLines = doc.splitTextToSize(`• "${fact.claim}" — [${fact.sourceTitle}] (${fact.sourceDate})`, contentWidth - 10);
      doc.text(factLines, margin + 8, y);
      y += factLines.length * 11 + 4;
    });
    y += 10;
  }

  // 2. Role Requirements Map & Strengths / Gaps
  drawSectionTitle('2. Role Requirements Match & Skill Gap Analysis');
  data.analysis.requirementsMatch.forEach((rm) => {
    checkPageBreak(45);
    const statusColor = rm.status === 'matched' ? [34, 197, 94] : rm.status === 'partial' ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(rm.requirement, margin + 10, y + 14);

    doc.setFontSize(8);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`[${rm.status.toUpperCase()}]`, pageWidth - margin - 60, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const evLines = doc.splitTextToSize(`Evidence: ${rm.evidence}`, contentWidth - 20);
    doc.text(evLines, margin + 10, y + 26);
    y += 42;
  });

  // Strengths and Gaps
  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(34, 197, 94);
  doc.text('Key Competitive Strengths:', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  data.analysis.strengths.forEach((s) => {
    checkPageBreak(18);
    const lines = doc.splitTextToSize(`+ ${s}`, contentWidth - 10);
    doc.text(lines, margin + 8, y);
    y += lines.length * 12 + 3;
  });
  y += 8;

  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(239, 68, 68);
  doc.text('Areas Requiring Preparation / Evidence Clarification:', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  data.analysis.gaps.forEach((g) => {
    checkPageBreak(18);
    const lines = doc.splitTextToSize(`- ${g}`, contentWidth - 10);
    doc.text(lines, margin + 8, y);
    y += lines.length * 12 + 3;
  });
  y += 14;

  // 3. Technical Questions & Answer Outlines (15-20 Questions)
  drawSectionTitle('3. Technical Interview Questions & High-Impact Outlines');
  const technicalQuestions = [
    {
      q: 'How do you design an idempotent API endpoint for payment processing or critical mutations?',
      framework: 'Concepts: Idempotency keys, atomic SETNX in Redis, unique database constraints in PostgreSQL, returning consistent 200/409 responses.'
    },
    {
      q: 'Explain PostgreSQL transaction isolation levels and how you prevent dirty reads vs phantom reads.',
      framework: 'Concepts: Read Committed, Repeatable Read, Serializable. Use SELECT FOR UPDATE for row-level locking on balance mutations.'
    },
    {
      q: 'How do you diagnose slow queries in production and what strategies do you employ?',
      framework: 'Concepts: EXPLAIN (ANALYZE, BUFFERS), composite B-tree indexing, avoiding full table scans, PgBouncer connection pooling.'
    },
    {
      q: 'Compare Kafka vs RabbitMQ: when would you choose which message broker for distributed tasks?',
      framework: 'Concepts: Kafka for high-throughput append-only distributed event logs with replayability; RabbitMQ for flexible AMQP routing and complex work queues.'
    },
    {
      q: 'How do you prevent cache stampedes and handle cache invalidation at scale?',
      framework: 'Concepts: Cache-aside vs write-through, probabilistic early expiration (XFetch), mutex locks on cache miss, TTL jittering.'
    },
    {
      q: 'How do you architect an optimistic UI in React with resilient rollback handling?',
      framework: 'Concepts: Immediate state update, snapshotting previous state, onError rollback with user notification, avoiding desync with server.'
    },
    {
      q: 'What is your strategy for zero-downtime database schema migrations in high-traffic tables?',
      framework: 'Concepts: Expand-and-contract pattern: add nullable column, dual-write in application, backfill asynchronously, make column non-null, cut over read.'
    },
    {
      q: 'How do you implement rate limiting across distributed API servers?',
      framework: 'Concepts: Token bucket / Leaky bucket algorithm, Redis sliding window counter with Lua scripts for atomic execution.'
    },
    {
      q: 'Explain the difference between strong consistency and eventual consistency in distributed data stores.',
      framework: 'Concepts: CAP theorem, PACELC theorem, quorum reads/writes, conflict-free replicated data types (CRDTs), saga patterns.'
    },
    {
      q: 'How do you secure server-to-server webhook ingestion against spoofing and tampering?',
      framework: 'Concepts: HMAC SHA-256 signature verification in HTTP headers with shared secrets, timestamp replay defense, constant-time comparison.'
    }
  ];

  technicalQuestions.forEach((tq, i) => {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const qLines = doc.splitTextToSize(`Q${i + 1}: ${tq.q}`, contentWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 13 + 3;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const aLines = doc.splitTextToSize(`Preparation Framework: ${tq.framework}`, contentWidth - 10);
    doc.text(aLines, margin + 10, y);
    y += aLines.length * 11 + 8;
  });
  y += 10;

  // 4. HR & Behavioral Questions with STAR Framework
  drawSectionTitle('4. HR & Behavioral Questions (STAR Method Outlines)');
  const behavioralQuestions = [
    {
      q: 'Tell me about a time you had a strong technical disagreement with a team member.',
      star: 'Situation: Disagreement on DB choice or API contract. Task: Align team on optimal customer outcome. Action: Built data-driven POC, measured latency, facilitated open discussion. Result: Team adopted proven path with mutual respect.'
    },
    {
      q: 'Describe a major production outage you investigated and resolved.',
      star: 'Situation: Sudden latency spike during peak traffic. Task: Triage incident under SLA constraints. Action: Rolled back canary release, identified missing index, wrote post-mortem. Result: System stabilized in 12 min; added automated regression alerts.'
    },
    {
      q: 'Give an example of how you mentored a junior engineer or upskilled your peers.',
      star: 'Situation: New hire struggled with distributed debugging. Task: Help build confidence and autonomy. Action: Pair programmed, instituted PR review guides, celebrated small wins. Result: Engineer independently shipped critical feature 2 months later.'
    },
    {
      q: 'Why do you want to join this specific company at this point in your career?',
      star: 'Situation: Career milestone. Task: Articulate genuine value alignment. Action: Cite specific engineering challenges, business mission, and cultural values. Result: Strong conviction and authentic contribution plan.'
    }
  ];

  behavioralQuestions.forEach((bq, i) => {
    checkPageBreak(55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const qLines = doc.splitTextToSize(`Behavioral Q${i + 1}: ${bq.q}`, contentWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 13 + 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const starLines = doc.splitTextToSize(`STAR Blueprint: ${bq.star}`, contentWidth - 10);
    doc.text(starLines, margin + 10, y);
    y += starLines.length * 11 + 8;
  });
  y += 10;

  // 5. Personalized 7-Day Preparation Schedule
  drawSectionTitle('5. Personalized 7-Day Preparation Roadmap');
  data.analysis.studyPlan.forEach((sp) => {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(139, 92, 246);
    doc.text(`Day ${sp.day}: ${sp.focus}`, margin, y);
    y += 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const taskLines = doc.splitTextToSize(sp.task, contentWidth - 10);
    doc.text(taskLines, margin + 8, y);
    y += taskLines.length * 12 + 6;
  });
  y += 10;

  // 6. Important Caveats & Legal/Ethical Notes
  drawSectionTitle('6. Revision Checklist & Practice Disclosures');
  const checklist = [
    'Test microphone and quiet environment at least 15 minutes prior to the live interview.',
    'Have 2-3 prepared questions ready to ask the interviewer about team roadmap and culture.',
    'Keep a pen and paper handy for quick architecture doodles and trade-off summaries.',
    'Verify all facts in your behavioral answers match your truthful personal experience.',
    'Remember: Practice outlines must be adapted to your genuine experience. Never present AI simulations as guaranteed company questions.'
  ];
  checklist.forEach((item) => {
    checkPageBreak(25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const itemLines = doc.splitTextToSize(`[ ]  ${item}`, contentWidth - 10);
    doc.text(itemLines, margin + 6, y);
    y += itemLines.length * 12 + 4;
  });

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Personal AI Coach • Confidential & Personalized for ${data.userName}`, margin, pageHeight - 15);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
  }

  const outputArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(outputArrayBuffer);
}
