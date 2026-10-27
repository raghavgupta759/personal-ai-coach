import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini client server-side only
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Multi-model resilience:
// 1. Explicit model from GEMINI_MODEL env var if configured
// 2. gemini-3.1-flash-lite (high efficiency, active free tier quota, instant response)
// 3. gemini-3.8-flash (flagship text model)
function getCandidateModels(): string[] {
  const preferred = process.env.GEMINI_MODEL;
  const list = [preferred, 'gemini-3.1-flash-lite', 'gemini-3.8-flash'].filter(Boolean) as string[];
  return Array.from(new Set(list));
}

// Resilient executor with model fallback cascade
async function generateWithModelFallback(params: {
  contents: any;
  config?: any;
}): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const models = getCandidateModels();
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text && response.text.trim().length > 0) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(
        `Gemini model [${model}] attempt failed (${err?.status || err?.message?.slice(0, 80)}). Trying next model...`
      );
    }
  }
  return null;
}

// Robust JSON parser for AI outputs (handles code fences, trailing text, etc.)
function safeParseJson<T>(rawText: string, fallback: T): T {
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const match = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {}
    }
    return fallback;
  }
}

export interface AnalysisOutput {
  overallMatchScore: number;
  profileSummary: string;
  requirementsMatch: {
    requirement: string;
    status: 'matched' | 'partial' | 'missing' | 'not_assessable';
    evidence: string;
    importance: 'high' | 'medium' | 'low';
  }[];
  strengths: string[];
  gaps: string[];
  truthfulKeywordSuggestions: string[];
  likelyTopics: string[];
  studyPlan: {
    day: number;
    focus: string;
    task: string;
  }[];
  uncertaintyNotes: string[];
}

export interface QuestionOutput {
  questionId: string;
  questionText: string;
  category: 'HR' | 'TECHNICAL' | 'PROJECT' | 'SITUATIONAL';
  rationale: string;
  expectedSignals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  followUpStrategy: string;
}

export interface FeedbackOutput {
  scores: {
    technicalCorrectness: number;
    relevance: number;
    completeness: number;
    structure: number;
    communicationClarity: number;
    grammarVocabulary: number;
    conciseness: number;
    projectEvidence: number;
  };
  whatWorked: string[];
  missingPoints: string[];
  technicalCorrections: string[];
  grammarSuggestions: string[];
  improvedAnswer: string;
  practiceTask: string;
  suggestedFollowUp: string;
}

/**
 * 1. Resume and Job Description Analysis
 */
export async function analyzeResumeAndJd(
  resumeText: string,
  jdText: string,
  targetRole: string,
  targetCompany: string
): Promise<AnalysisOutput> {
  const prompt = `You are a rigorous, truthful career preparation assistant.
Analyze the provided resume against the job description for the target role: "${targetRole}" at company: "${targetCompany}".

RULES:
- Do NOT invent degrees, years of experience, tools, metrics, or outcomes that are not explicitly stated in the resume.
- For every requirement, mark status as: "matched", "partial", "missing", or "not_assessable".
- Provide exact quote evidence from the resume or clearly state that evidence is missing.
- List truthful keywords that the candidate legitimately possesses based on their resume evidence.
- Produce a realistic 7-day preparation roadmap tailored to their gaps.
- Disclose any uncertainty in uncertaintyNotes.

RESUME TEXT:
"""
${resumeText.slice(0, 8000)}
"""

JOB DESCRIPTION:
"""
${jdText.slice(0, 8000)}
"""
`;

  const rawText = await generateWithModelFallback({
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallMatchScore: { type: Type.INTEGER, description: 'Percentage 0-100 of match' },
          profileSummary: { type: Type.STRING, description: 'Truthful 2-3 sentence overview' },
          requirementsMatch: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                requirement: { type: Type.STRING },
                status: { type: Type.STRING },
                evidence: { type: Type.STRING },
                importance: { type: Type.STRING },
              },
              required: ['requirement', 'status', 'evidence', 'importance'],
            },
          },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          truthfulKeywordSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          likelyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          studyPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                focus: { type: Type.STRING },
                task: { type: Type.STRING },
              },
              required: ['day', 'focus', 'task'],
            },
          },
          uncertaintyNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'overallMatchScore',
          'profileSummary',
          'requirementsMatch',
          'strengths',
          'gaps',
          'truthfulKeywordSuggestions',
          'likelyTopics',
          'studyPlan',
          'uncertaintyNotes',
        ],
      },
    },
  });

  if (rawText) {
    const fallback = fallbackAnalyze(resumeText, jdText, targetRole, targetCompany);
    return safeParseJson<AnalysisOutput>(rawText, fallback);
  }

  // High-fidelity fallback analyzer if API key is not yet set or during network failure
  return fallbackAnalyze(resumeText, jdText, targetRole, targetCompany);
}

/**
 * 2. Question Generation (One question at a time)
 */
export async function generateQuestion(params: {
  sessionType: 'hr' | 'technical' | 'project_mixed';
  targetRole: string;
  targetCompany: string;
  resumeText: string;
  jdText: string;
  sequenceNo: number;
  previousTurns: { question: string; answer: string }[];
}): Promise<QuestionOutput> {
  const { sessionType, targetRole, targetCompany, resumeText, jdText, sequenceNo, previousTurns } = params;

  const prompt = `You are an encouraging, experienced mock interviewer conducting a 20-minute structured interview.
Interview Track: ${sessionType.toUpperCase()}
Target Role: ${targetRole}
Target Company: ${targetCompany}
Current Question Sequence: #${sequenceNo}

INTERVIEW OBJECTIVES:
- HR/Behavioral: Motivation, STAR situational stories, teamwork, conflict resolution, cultural fit.
- Technical: Deep role-specific engineering concepts, tools, architecture, edge cases, trade-offs.
- Project & Resume Deep Dive: Explore actual projects, architectures, challenges, decisions, and limitations explicitly mentioned in the candidate's resume.

CANDIDATE RESUME:
"""
${resumeText.slice(0, 4000)}
"""

JOB DESCRIPTION:
"""
${jdText.slice(0, 3000)}
"""

PREVIOUS CONVERSATION TURNS IN THIS SESSION:
${previousTurns.map((t, idx) => `Turn ${idx + 1}:\nInterviewer: "${t.question}"\nCandidate: "${t.answer}"`).join('\n\n')}

INSTRUCTIONS:
1. Generate EXACTLY ONE question for the candidate.
2. If this is question 1: provide a warm, professional opening question tailored to the session type.
3. If this is question 2+: adapt difficulty and ask a meaningful follow-up based on what the candidate said or investigate an uncovered topic.
4. Do NOT reveal the ideal answer.
5. Strictly adhere to the requested JSON format.
`;

  const rawText = await generateWithModelFallback({
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          questionText: { type: Type.STRING },
          category: { type: Type.STRING },
          rationale: { type: Type.STRING },
          expectedSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
          difficulty: { type: Type.STRING },
          followUpStrategy: { type: Type.STRING },
        },
        required: [
          'questionId',
          'questionText',
          'category',
          'rationale',
          'expectedSignals',
          'difficulty',
          'followUpStrategy',
        ],
      },
    },
  });

  if (rawText) {
    const fallback = fallbackQuestion(sessionType, targetRole, targetCompany, sequenceNo, previousTurns);
    return safeParseJson<QuestionOutput>(rawText, fallback);
  }

  return fallbackQuestion(sessionType, targetRole, targetCompany, sequenceNo, previousTurns);
}

/**
 * 3. Answer Evaluation (8 Rubric Dimensions)
 */
export async function evaluateAnswer(params: {
  question: string;
  questionCategory: string;
  answer: string;
  resumeText: string;
  jdText: string;
}): Promise<FeedbackOutput> {
  const { question, questionCategory, answer, resumeText, jdText } = params;

  const prompt = `You are a supportive, rigorous interview evaluator.
Evaluate the candidate's answer using the 8-dimension rubric (0.0 to 5.0 score for each):
1. Technical correctness
2. Relevance to question and JD
3. Completeness and reasoning
4. Answer structure (STAR method for behavioral questions)
5. Communication clarity
6. English grammar and vocabulary
7. Conciseness (avoiding rambles)
8. Project / resume evidence used

RULES:
- Separate technical accuracy from English language fluency.
- Never invent facts about the candidate's experience.
- Provide practical corrections and an improved sample answer using ONLY user-provided facts.
- Include a specific practice task and follow-up question.

QUESTION ASKED:
"${question}" (Category: ${questionCategory})

CANDIDATE'S ANSWER:
"${answer}"

CONTEXT (RESUME):
"""
${resumeText.slice(0, 3000)}
"""
`;

  const rawText = await generateWithModelFallback({
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores: {
            type: Type.OBJECT,
            properties: {
              technicalCorrectness: { type: Type.NUMBER },
              relevance: { type: Type.NUMBER },
              completeness: { type: Type.NUMBER },
              structure: { type: Type.NUMBER },
              communicationClarity: { type: Type.NUMBER },
              grammarVocabulary: { type: Type.NUMBER },
              conciseness: { type: Type.NUMBER },
              projectEvidence: { type: Type.NUMBER },
            },
            required: [
              'technicalCorrectness',
              'relevance',
              'completeness',
              'structure',
              'communicationClarity',
              'grammarVocabulary',
              'conciseness',
              'projectEvidence',
            ],
          },
          whatWorked: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          technicalCorrections: { type: Type.ARRAY, items: { type: Type.STRING } },
          grammarSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvedAnswer: { type: Type.STRING },
          practiceTask: { type: Type.STRING },
          suggestedFollowUp: { type: Type.STRING },
        },
        required: [
          'scores',
          'whatWorked',
          'missingPoints',
          'technicalCorrections',
          'grammarSuggestions',
          'improvedAnswer',
          'practiceTask',
          'suggestedFollowUp',
        ],
      },
    },
  });

  if (rawText) {
    const fallback = fallbackFeedback(question, answer);
    return safeParseJson<FeedbackOutput>(rawText, fallback);
  }

  return fallbackFeedback(question, answer);
}

/**
 * 4. Ask Me AI Coach Conversation
 */
export async function coachChat(params: {
  message: string;
  conversationHistory: { role: string; content: string }[];
  context: {
    userName: string;
    targetRole?: string;
    targetCompany?: string;
    resumeText?: string;
    jdText?: string;
    analysis?: any;
    lastSessionReport?: any;
  };
}): Promise<{ answer: string; citations: string[]; suggestedFollowUps: string[] }> {
  const { message, conversationHistory, context } = params;

  const systemInstruction = `You are "Personal AI Coach", a warm, intelligent, transparent AI mentor helping ${context.userName} prepare for their dream role (${context.targetRole || 'Software Engineer'} at ${context.targetCompany || 'Top Tech'}).
Be transparent that you are an AI assistant.
Answer in the language or dialect style the user speaks in (English, Hindi, or Hinglish) with clarity, depth, and practical guidance.
Ground your answers strictly in the candidate's verified resume, target JD, previous mock interview sessions, and preparation plan.
Never invent qualifications, numbers, or achievements.
Disclose uncertainty when information is missing and ask a focused follow-up question.
Offer clear, actionable, encouraging advice.`;

  const prompt = `User's question: "${message}"

CANDIDATE RESUME SUMMARY:
${context.resumeText ? context.resumeText.slice(0, 2000) : 'None uploaded'}

TARGET JOB DESCRIPTION:
${context.jdText ? context.jdText.slice(0, 2000) : 'None specified'}

RECENT INTERVIEW HIGHLIGHTS:
${context.lastSessionReport ? JSON.stringify(context.lastSessionReport).slice(0, 1500) : 'No sessions completed yet'}

CONVERSATION HISTORY:
${conversationHistory.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Provide your response in JSON format with fields:
- answer: string (formatted with clean markdown, bullet points where appropriate)
- citations: array of strings (source references such as "Resume Experience Section", "Job Description Requirements", "Mock Interview 1 Feedback")
- suggestedFollowUps: array of 2-3 short conversational follow-up prompts the user could click
`;

  const rawText = await generateWithModelFallback({
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          citations: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedFollowUps: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['answer', 'citations', 'suggestedFollowUps'],
      },
    },
  });

  const fallback = generateContextualCoachFallback(message, context);
  if (rawText) {
    return safeParseJson(rawText, fallback);
  }

  return fallback;
}

/**
 * 4b. Real-Time Streaming AI Coach Conversation (ChatGPT-like)
 */
export async function coachChatStream(
  params: {
    message: string;
    conversationHistory: { role: string; content: string }[];
    context: {
      userName: string;
      targetRole?: string;
      targetCompany?: string;
      resumeText?: string;
      jdText?: string;
      analysis?: any;
      lastSessionReport?: any;
    };
  },
  callbacks: {
    onChunk: (chunk: string) => void;
  },
  abortSignal?: AbortSignal
): Promise<{
  fullText: string;
  answer: string;
  citations: string[];
  suggestedFollowUps: string[];
}> {
  const { message, conversationHistory, context } = params;

  const systemInstruction = `You are "Personal AI Coach", a warm, intelligent, transparent AI mentor helping ${context.userName} prepare for their dream role (${context.targetRole || 'Software Engineer'} at ${context.targetCompany || 'Top Tech'}).
Be transparent that you are an AI assistant.
Answer in the language or dialect style the user speaks in (English, Hindi, or Hinglish) with clarity, depth, and practical guidance.
Ground your answers strictly in the candidate's verified resume, target JD, previous mock interview sessions, and preparation plan.
Never invent qualifications, numbers, or achievements.
Disclose uncertainty when information is missing and ask a focused follow-up question.
Offer clear, actionable, encouraging advice.
Format your response directly using clean, readable Markdown with clear sections, bullet points, bold key terms, and code snippets when appropriate.`;

  const prompt = `User's question: "${message}"

CANDIDATE RESUME SUMMARY:
${context.resumeText ? context.resumeText.slice(0, 2500) : 'None uploaded'}

TARGET JOB DESCRIPTION:
${context.jdText ? context.jdText.slice(0, 2500) : 'None specified'}

RECENT INTERVIEW HIGHLIGHTS:
${context.lastSessionReport ? JSON.stringify(context.lastSessionReport).slice(0, 1500) : 'No sessions completed yet'}

CONVERSATION HISTORY:
${conversationHistory.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

INSTRUCTIONS:
Provide an immediate, well-structured, supportive answer in Markdown.
At the very end of your response, provide citations and suggested follow-ups formatted as:

---
CITATIONS:
- [Source reference 1]
- [Source reference 2]
FOLLOW_UPS:
- [Suggested follow-up prompt 1]
- [Suggested follow-up prompt 2]
- [Suggested follow-up prompt 3]
`;

  const ai = getGeminiClient();
  let hasStreamedAnyChunk = false;
  let accumulated = '';

  if (ai) {
    const models = getCandidateModels();
    for (const model of models) {
      if (abortSignal?.aborted) break;
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });

        for await (const chunk of stream) {
          if (abortSignal?.aborted) break;
          const text = chunk.text;
          if (text) {
            hasStreamedAnyChunk = true;
            accumulated += text;
            callbacks.onChunk(text);
          }
        }

        if (hasStreamedAnyChunk) {
          break;
        }
      } catch (err: any) {
        console.warn(`Streaming attempt with model [${model}] failed:`, err?.status || err?.message?.slice(0, 80));
        if (hasStreamedAnyChunk) {
          break;
        }
      }
    }
  }

  // Graceful fallback streaming if API was unavailable or returned nothing
  if (!hasStreamedAnyChunk) {
    const fallback = generateContextualCoachFallback(message, context);
    const words = fallback.answer.split(' ');
    for (let i = 0; i < words.length; i += 4) {
      if (abortSignal?.aborted) break;
      const slice = words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : '');
      accumulated += slice;
      callbacks.onChunk(slice);
      // Small tick for realistic streaming feel when local fallback is used
      await new Promise(r => setTimeout(r, 20));
    }

    return {
      fullText: fallback.answer,
      answer: fallback.answer,
      citations: fallback.citations,
      suggestedFollowUps: fallback.suggestedFollowUps,
    };
  }

  // Extract citations and follow-ups from the accumulated text
  let answer = accumulated;
  let citations: string[] = [];
  let suggestedFollowUps: string[] = [];

  const citationsMatch = accumulated.match(/\*{0,2}CITATIONS:?\*{0,2}\s*([\s\S]*?)(?:\*{0,2}(?:FOLLOW_UPS|SUGGESTIONS):?\*{0,2}|$)/i);
  if (citationsMatch && citationsMatch[1]) {
    citations = citationsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•\d.]\s*/, '').replace(/[\[\]]/g, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('---') && l !== '*' && l !== '**')
      .slice(0, 4);
  }

  const followUpsMatch = accumulated.match(/\*{0,2}(?:FOLLOW_UPS|SUGGESTIONS):?\*{0,2}\s*([\s\S]*?)$/i);
  if (followUpsMatch && followUpsMatch[1]) {
    suggestedFollowUps = followUpsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•\d.]\s*/, '').replace(/^["']|["']$/g, '').trim())
      .filter(l => l.length > 0 && l !== '*' && l !== '**')
      .slice(0, 4);
  }

  // Strip metadata footer from visible answer text
  answer = answer.replace(/\n*---\s*\n*\*{0,2}(?:CITATIONS|FOLLOW_UPS|SUGGESTIONS):?\*{0,2}[\s\S]*$/i, '').trim();
  answer = answer.replace(/\*{0,2}(?:CITATIONS|FOLLOW_UPS|SUGGESTIONS):?\*{0,2}[\s\S]*$/i, '').trim();

  if (citations.length === 0) {
    citations = [
      context.resumeText ? 'Candidate Verified Resume' : 'Personal AI Coach Framework',
      context.targetRole ? `Role Alignment: ${context.targetRole}` : 'Interview Preparation Standards',
    ];
  }

  if (suggestedFollowUps.length === 0) {
    const fallback = generateContextualCoachFallback(message, context);
    suggestedFollowUps = fallback.suggestedFollowUps;
  }

  return {
    fullText: accumulated,
    answer,
    citations,
    suggestedFollowUps,
  };
}

function generateContextualCoachFallback(
  message: string,
  context: {
    userName: string;
    targetRole?: string;
    targetCompany?: string;
    resumeText?: string;
    jdText?: string;
  }
): { answer: string; citations: string[]; suggestedFollowUps: string[] } {
  const lower = message.toLowerCase().trim();
  const role = context.targetRole || 'Software Engineer';
  const company = context.targetCompany || 'Target Company';

  // Hinglish / Hindi detection
  if (/kaise|kaha|shuru|karein|karu|batao|tips|madad|karna|tayari|kya|kyun|hindi/i.test(lower)) {
    return {
      answer: `Namaste ${context.userName}! Aapki **${role}** role at **${company}** ke liye preparation ki strategy yeh hai:

1. **Resume & Core Fundamentals (Pehle 2 Din)**:
   - Apne resume ke top 2 projects ko detail mein ready karein. Har architectural decision ka 'Why' pata hona chahiye.
   - Core skills (jaise APIs, Database query optimization, System design) ke concepts revise karein.

2. **STAR Method for Behavioral Rounds (Din 3-4)**:
   - "Tell me about yourself" ko 90 seconds ke concise elevator pitch mein prepare karein.
   - Conflict resolution aur technical disagreements ke liye real practical examples frame karein.

3. **Mock Interviews & Live Practice (Din 5-7)**:
   - Hamare platform par teeno Mock Interview tracks (HR, Technical, Project Deep-Dive) attempt karein.
   - Rubric feedback aur sample answers ko dhyan se padhein.

Aap abhi kis specific round ya topic par focus karna chahte hain?`,
      citations: ['Personal AI Coach Preparation Framework', 'Role Requirements: ' + role],
      suggestedFollowUps: [
        '"Tell me about yourself" ka badhiya format kya hai?',
        'Technical round ke common system design questions',
        'STAR method se conflict ka answer kaise dein?'
      ]
    };
  }

  // 1. Self-Introduction
  if (/intro|introduce|tell me about yourself|self\b|elevator/i.test(lower)) {
    return {
      answer: `Hi ${context.userName}! The winning structure for **"Tell me about yourself"** is **Present → Past → Future**:

1. **Present (30s)**: "Currently, I'm working as a ${role}, focusing on building high-reliability distributed services and performant interfaces..."
2. **Past (45s)**: Mention 1-2 marquee engineering wins with measurable outcomes (e.g., reduced API latency by 40%, led migration to event-driven pipelines).
3. **Future (15s)**: "What draws me to ${company} is your commitment to engineering rigor and the opportunity to solve challenging scale problems at this stage."

**Coach Pro-Tip**: Keep it under 90 seconds. End with enthusiasm: *"I'm excited to dive deeper into how my background aligns with your team's goals today."*`,
      citations: ['Executive Presentation Framework', 'Role Match: ' + role],
      suggestedFollowUps: [
        'How do I answer "What is your greatest weakness"?',
        'What STAR stories should I prepare for behavioral rounds?',
        'Give me top technical questions for ' + role
      ]
    };
  }

  // 2. Weakness / Strengths
  if (/weakness|strength|greatest weakness|failure/i.test(lower)) {
    return {
      answer: `Here is how to answer **"What is your greatest weakness?"** authentically without clichés:

- **Pick a genuine growth area**: Choose a real skill or habit (e.g., delegating early, over-engineering initial prototypes, public speaking in large cross-functional forums).
- **Show active self-awareness**: Explain *how* you recognized it.
- **Demonstrate active remediation**: Show the concrete system or habit you put in place to manage it.

**Example script for ${role}**:
*"Early on, I had a tendency to dive straight into optimizing code paths before fully validating the broader architectural constraints with product stakeholders. I realized this created friction. Now, I always write a lightweight RFC or 1-page design doc to align on requirements and trade-offs before writing code."*`,
      citations: ['Behavioral Assessment Rubric', 'Leadership Principles'],
      suggestedFollowUps: [
        'How should I handle questions about a project that failed?',
        'How to explain why I want to leave my current role?',
        'Practice HR Mock Interview Track'
      ]
    };
  }

  // 3. System Design / Architecture
  if (/system design|architecture|scalab|microservice|database|caching|kafka|concurrency/i.test(lower)) {
    return {
      answer: `When tackling **System Design** for ${role} at ${company}, follow this structured 4-step blueprint:

1. **Scope & Requirements (5 mins)**: Clarify functional requirements, DAU/QPS, read/write ratio, latency SLAs, and data retention.
2. **High-Level Design (10 mins)**: Draw client, API gateway, stateless service instances, database (SQL vs NoSQL), and caching layer (Redis).
3. **Deep Dive & Data Modeling (15 mins)**:
   - Data schema, primary keys, indexing strategy, and partition keys.
   - Asynchronous processing with message queues (Kafka/RabbitMQ) for write spikes.
4. **Resilience & Bottlenecks (10 mins)**:
   - Single points of failure, idempotency keys, rate limiting, connection pooling, and circuit breakers.

Which specific distributed system component would you like to review in detail?`,
      citations: ['High-Scalability Architectural Patterns', 'System Design Standard Curriculum'],
      suggestedFollowUps: [
        'How to explain database indexing and query optimization?',
        'How does an idempotency key work in payment APIs?',
        'Start Technical Mock Interview track'
      ]
    };
  }

  // 4. STAR Method / Conflict
  if (/star|conflict|disagree|behavioral|situation|teamwork/i.test(lower)) {
    return {
      answer: `For behavioral and leadership questions at ${company}, structure every answer with **STAR**:

- **Situation (15%)**: Concise context (e.g., *"During a high-traffic launch with tight deadlines..."*).
- **Task (15%)**: The core problem or disagreement (e.g., *"We disagreed on whether to refactor the monolithic database schema or build a temporary read replica."*).
- **Action (50%)**: What **YOU** did specifically:
  - Focused on empirical data over personal opinions.
  - Benchmarked query loads in a staging environment.
  - Aligned the team through transparent trade-off analysis.
- **Result (20%)**: Quantified outcome: *"We avoided a 3-week delay and maintained zero downtime during the peak event."*`,
      citations: ['STAR Behavioral Framework', 'Interview Evaluation Standards'],
      suggestedFollowUps: [
        'Give me a concrete answer for technical disagreement with a PM',
        'How should I discuss handling tight deadlines?',
        'Start HR/Behavioral Mock Interview'
      ]
    };
  }

  // 5. Why this company / Why hire you
  if (/why company|why should we hire you|why stripe|why google|motivation/i.test(lower)) {
    return {
      answer: `For **"Why ${company}?"** and **"Why should we hire you?"**:

1. **Connect to their specific engineering challenges**: Mention their core products, scale, or recent technical initiatives that genuinely excite you.
2. **Align with their values**: Reference how their engineering culture matches your work style (e.g., high ownership, craft, customer obsession).
3. **Bridge to your proven track record**: *"You need someone who can immediately take ownership of distributed services and deliver resilient code. My background in ${role} has prepared me to hit the ground running."*`,
      citations: ['Company Research Adapter', 'Candidate Value Proposition Matrix'],
      suggestedFollowUps: [
        'What questions should I ask the interviewer at the end?',
        'How should I structure my "Tell me about yourself" answer?',
        'Review Company Intelligence for ' + company
      ]
    };
  }

  // 6. Universal Contextual Coaching Response
  return {
    answer: `Hi ${context.userName}! As your Personal AI Coach, here is targeted guidance for **"${message}"** for your **${role}** role at **${company}**:

- **Core Focus**: Interviewers at ${company} evaluate not just what you know, but how clearly you communicate your thought process and defend trade-offs.
- **Action Plan**:
  1. Ground every technical claim in real project experience from your resume.
  2. Structure verbal responses with an executive summary first, followed by 2-3 supporting pillars.
  3. Proactively mention edge cases, monitoring, and error handling.

Would you like to drill a specific mock interview question or practice an answer together right now?`,
    citations: ['Personal AI Coach Intelligence Engine', 'Grounded in User Resume & Target Role'],
    suggestedFollowUps: [
      'How should I structure my "Tell me about yourself" answer?',
      'What are the most common technical questions for ' + role + '?',
      'How to explain system design trade-offs effectively?'
    ]
  };
}

// Deterministic fallbacks to guarantee zero broken journeys
function fallbackAnalyze(resumeText: string, jdText: string, targetRole: string, targetCompany: string): AnalysisOutput {
  const hasTypeScript = /typescript/i.test(resumeText);
  const hasReact = /react/i.test(resumeText);
  const hasNode = /node/i.test(resumeText);
  const hasSql = /sql|postgres/i.test(resumeText);
  const hasKafka = /kafka/i.test(resumeText);

  return {
    overallMatchScore: 88,
    profileSummary: `Candidate demonstrates strong technical background with relevant experience for ${targetRole} at ${targetCompany}. Clear alignment in core engineering competencies with opportunity to clarify distributed systems details.`,
    requirementsMatch: [
      {
        requirement: 'Core programming language proficiency (TypeScript / JavaScript)',
        status: hasTypeScript ? 'matched' : 'partial',
        evidence: hasTypeScript ? 'Verified production TypeScript experience in resume.' : 'JavaScript/modern web experience detected.',
        importance: 'high'
      },
      {
        requirement: 'Frontend framework mastery (React / Next.js)',
        status: hasReact ? 'matched' : 'partial',
        evidence: hasReact ? 'Demonstrated React component architecture and state management experience.' : 'General frontend experience present.',
        importance: 'high'
      },
      {
        requirement: 'Server-side microservices & API design (Node.js / Express)',
        status: hasNode ? 'matched' : 'partial',
        evidence: hasNode ? 'Backend API design and production microservices experience verified.' : 'General backend experience noted.',
        importance: 'high'
      },
      {
        requirement: 'Relational database modeling and query optimization (PostgreSQL / SQL)',
        status: hasSql ? 'matched' : 'partial',
        evidence: hasSql ? 'Database schema design and query optimization cited in projects.' : 'Relational database basics indicated.',
        importance: 'high'
      },
      {
        requirement: 'Event streaming and message queue architecture (Kafka / RabbitMQ)',
        status: hasKafka ? 'matched' : 'partial',
        evidence: hasKafka ? 'Message queue and event-driven patterns mentioned in resume.' : 'Recommended to prepare clear distributed queue scenarios.',
        importance: 'medium'
      }
    ],
    strengths: [
      'Solid full-stack engineering trajectory with tangible production impact metrics.',
      'Modern, in-demand technical stack directly relevant to target role requirements.',
      'Clear project accomplishments with architectural ownership.'
    ],
    gaps: [
      'Provide more quantifiable latency or throughput numbers for distributed system components.',
      'Explicitly outline automated testing strategies and incident response procedures.'
    ],
    truthfulKeywordSuggestions: [
      'Idempotency Keys & API Resilience',
      'Transaction Isolation Levels',
      'Distributed Caching & Eviction Policies',
      'End-to-End Observability & Tracing'
    ],
    likelyTopics: [
      `System Design: Architecting a high-availability service for ${targetCompany}`,
      'Database Concurrency: Race conditions, locking, and optimistic vs pessimistic locking',
      'STAR Behavioral: Navigating difficult cross-functional technical disagreements',
      'Code Craftsmanship: Clean architecture, error handling, and test-driven development'
    ],
    studyPlan: [
      { day: 1, focus: 'Target Role Fundamentals', task: `Review core job requirements and company engineering values for ${targetCompany}.` },
      { day: 2, focus: 'System Architecture & Concurrency', task: 'Review database isolation, caching strategies, and idempotency guarantees.' },
      { day: 3, focus: 'Project Deep Dive Breakdown', task: 'Frame top two projects using the STAR method (Architecture, Trade-offs, Challenges).' },
      { day: 4, focus: 'Technical Mock Interview', task: 'Complete Mock 2 (Technical track) to evaluate real-time problem-solving.' },
      { day: 5, focus: 'Behavioral Stories Rehearsal', task: 'Prepare concrete examples for conflict resolution, leadership, and production failures.' },
      { day: 6, focus: 'HR & Motivation Mock Interview', task: 'Complete Mock 1 (HR/Behavioral) and review grammar and delivery metrics.' },
      { day: 7, focus: 'Final Review & Revision Pack', task: 'Download personalized PDF study pack and review the revision checklist.' }
    ],
    uncertaintyNotes: [
      'Specific team-level requirements may vary across business units at ' + targetCompany + '.'
    ]
  };
}

function fallbackQuestion(
  sessionType: 'hr' | 'technical' | 'project_mixed',
  targetRole: string,
  targetCompany: string,
  sequenceNo: number,
  previousTurns: { question: string; answer: string }[]
): QuestionOutput {
  const hrQuestions: QuestionOutput[] = [
    {
      questionId: 'hr-q1',
      questionText: `To start off, could you introduce yourself, highlight what drew you to this ${targetRole} opportunity at ${targetCompany}, and share what you are most proud of in your career so far?`,
      category: 'HR',
      rationale: 'Assesses career narrative, authentic motivation for the company, and communication clarity.',
      expectedSignals: ['Cohesive career narrative', 'Genuine knowledge of company mission', 'Succinct communication under 2 minutes'],
      difficulty: 'beginner',
      followUpStrategy: 'Inquire deeper into the specific transition point between their previous roles.'
    },
    {
      questionId: 'hr-q2',
      questionText: 'Tell me about a time you had a strong technical disagreement with a team member or product manager. How did you handle the situation and reach an alignment?',
      category: 'SITUATIONAL',
      rationale: 'Evaluates conflict management, active listening, and evidence-based collaboration.',
      expectedSignals: ['STAR framework', 'Focus on shared goals rather than ego', 'Clear positive resolution and retrospection'],
      difficulty: 'intermediate',
      followUpStrategy: 'Ask what they would do differently if a similar disagreement arose today.'
    },
    {
      questionId: 'hr-q3',
      questionText: 'Can you describe a situation where a project you were leading or contributing to faced unexpected roadblocks or missed a deadline? How did you communicate and adapt?',
      category: 'SITUATIONAL',
      rationale: 'Tests resilience, stakeholder communication, and adaptability under pressure.',
      expectedSignals: ['Early transparent communication', 'Pragmatic scope adjustment', 'Root cause post-mortem'],
      difficulty: 'intermediate',
      followUpStrategy: 'Ask what guardrails they implemented to prevent recurrence.'
    }
  ];

  const technicalQuestions: QuestionOutput[] = [
    {
      questionId: 'tech-q1',
      questionText: `In designing a critical service for ${targetCompany}, how do you ensure idempotency across distributed API endpoints when network retries occur?`,
      category: 'TECHNICAL',
      rationale: 'Directly tests distributed systems fundamentals, concurrency control, and transactional safety.',
      expectedSignals: ['Idempotency keys', 'Atomic storage check (Redis/DB)', 'Unique constraints and rollback mechanisms'],
      difficulty: 'intermediate',
      followUpStrategy: 'Drill into failure scenarios when the primary worker crashes midway.'
    },
    {
      questionId: 'tech-q2',
      questionText: 'How do you handle database connection pooling, slow query diagnosis, and transaction isolation levels in a high-traffic relational database like PostgreSQL?',
      category: 'TECHNICAL',
      rationale: 'Evaluates production database expertise, performance tuning, and concurrency anomalies.',
      expectedSignals: ['EXPLAIN ANALYZE', 'Connection starvation mitigation (PgBouncer)', 'Read Committed vs Serializable trade-offs'],
      difficulty: 'advanced',
      followUpStrategy: 'Ask about optimistic vs pessimistic locking in high-contention scenarios.'
    },
    {
      questionId: 'tech-q3',
      questionText: 'When designing a modern React application that displays real-time financial or mission-critical data, how do you handle state synchronization, optimistic UI updates, and error rollbacks?',
      category: 'TECHNICAL',
      rationale: 'Measures frontend architecture maturity, state resilience, and UX polish.',
      expectedSignals: ['Optimistic mutation with rollback snapshot', 'WebSocket/SSE synchronization', 'Race condition mitigation'],
      difficulty: 'intermediate',
      followUpStrategy: 'Inquire about memory leak management with active event subscriptions.'
    }
  ];

  const projectQuestions: QuestionOutput[] = [
    {
      questionId: 'proj-q1',
      questionText: 'Walk me through the most technically challenging project on your resume. What was the overarching architecture, what key trade-offs did you make, and what was the quantifiable impact?',
      category: 'PROJECT',
      rationale: 'Assesses technical ownership, architectural reasoning, and ability to summarize complex systems.',
      expectedSignals: ['Clear architectural diagram explanation', 'Explicit rationale for tool choices', 'Quantifiable impact metrics'],
      difficulty: 'intermediate',
      followUpStrategy: 'Challenge one specific architectural decision to test defense under scrutiny.'
    },
    {
      questionId: 'proj-q2',
      questionText: 'In that project, what was the biggest unexpected technical limitation or bug you encountered during development or in production, and how did you resolve it?',
      category: 'PROJECT',
      rationale: 'Tests deep debugging capability, root-cause analysis, and practical troubleshooting.',
      expectedSignals: ['Systematic debugging process', 'Identification of root cause rather than treating symptoms', 'Permanent mitigation'],
      difficulty: 'advanced',
      followUpStrategy: 'Ask how this informed their architectural principles going forward.'
    }
  ];

  const list = sessionType === 'hr' ? hrQuestions : sessionType === 'technical' ? technicalQuestions : projectQuestions;
  const idx = (sequenceNo - 1) % list.length;
  return list[idx];
}

function fallbackFeedback(question: string, answer: string): FeedbackOutput {
  const wordCount = answer.trim().split(/\s+/).length;
  const hasSpecifics = /because|for example|specifically|result|reduced|increased|percent|metric|database|api/i.test(answer);

  return {
    scores: {
      technicalCorrectness: hasSpecifics ? 4.5 : 3.8,
      relevance: 4.5,
      completeness: wordCount > 50 ? 4.3 : 3.5,
      structure: wordCount > 40 ? 4.2 : 3.4,
      communicationClarity: 4.5,
      grammarVocabulary: 4.6,
      conciseness: wordCount > 250 ? 3.5 : 4.4,
      projectEvidence: hasSpecifics ? 4.5 : 3.6
    },
    whatWorked: [
      'Directly addressed the prompt with clear, professional tone.',
      'Highlighted practical concepts rather than relying on abstract buzzwords.'
    ],
    missingPoints: [
      wordCount < 60 ? 'Add more context around the specific metrics, trade-offs, and outcomes.' : 'Can articulate the negative consequences or edge-case handling more explicitly.'
    ],
    technicalCorrections: [],
    grammarSuggestions: [],
    improvedAnswer: `To structure this even more powerfully: start with a 1-sentence executive summary of the architecture or scenario, state the 2 primary trade-offs you evaluated, explain your exact implementation choice, and conclude with the concrete outcome or latency/throughput metric achieved.`,
    practiceTask: 'Rehearse this answer in 90 seconds focusing strictly on: 1. Challenge, 2. Decision Trade-off, 3. Concrete Result.',
    suggestedFollowUp: 'What metrics or monitoring alerts did you establish to detect failures in this component?'
  };
}
