import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'personal_ai_coach.db');
export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      target_role TEXT,
      target_company TEXT,
      experience_level TEXT,
      email_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'jd')),
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      extracted_text TEXT,
      extraction_status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      resume_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
      jd_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
      target_role TEXT,
      target_company TEXT,
      result_json TEXT NOT NULL DEFAULT '{}',
      model_provider TEXT DEFAULT 'gemini-3.8-flash',
      prompt_version TEXT DEFAULT 'v1.0',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      analysis_id TEXT REFERENCES analyses(id) ON DELETE SET NULL,
      session_type TEXT NOT NULL CHECK (session_type IN ('hr', 'technical', 'project_mixed')),
      mode TEXT NOT NULL DEFAULT 'text' CHECK (mode IN ('text', 'voice')),
      status TEXT NOT NULL DEFAULT 'created',
      target_duration_seconds INTEGER NOT NULL DEFAULT 1200,
      started_at TEXT,
      ended_at TEXT,
      paused_seconds INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      ended_early INTEGER NOT NULL DEFAULT 0,
      final_report_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_turns (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
      sequence_no INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_category TEXT NOT NULL,
      question_metadata TEXT NOT NULL DEFAULT '{}',
      answer_text TEXT,
      transcript_edited INTEGER NOT NULL DEFAULT 0,
      feedback_json TEXT,
      asked_at TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at TEXT,
      UNIQUE(session_id, sequence_no)
    );

    CREATE TABLE IF NOT EXISTS coach_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coach_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system_summary')),
      content TEXT NOT NULL,
      citations_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_packs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      analysis_id TEXT REFERENCES analyses(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      title TEXT NOT NULL,
      source_manifest_json TEXT NOT NULL DEFAULT '[]',
      content_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS analyses_user_idx ON analyses(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS interviews_user_idx ON interview_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS coach_conversations_user_idx ON coach_conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS study_packs_user_idx ON study_packs(user_id, created_at DESC);
  `);

  seedDemoDataIfEmpty();
}

function seedDemoDataIfEmpty() {
  const checkUser = db.prepare('SELECT id FROM app_users WHERE email = ?').get('raghav@example.com');
  if (checkUser) return;

  const demoUserId = 'demo-user-raghav-001';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  const insertUser = db.prepare(`
    INSERT INTO app_users (id, name, email, password_hash, target_role, target_company, experience_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    demoUserId,
    'Raghav',
    'raghav@example.com',
    passwordHash,
    'Senior Full-Stack Engineer',
    'Stripe',
    'Senior (5-8 years)'
  );

  const demoResumeText = `Raghav Gupta
Senior Full-Stack Software Engineer | San Francisco, CA | raghav@example.com | github.com/raghav-dev

SUMMARY:
Results-driven Senior Full-Stack Engineer with 6+ years of experience designing and scaling distributed web applications, payment workflows, and real-time event-driven microservices. Deep expertise in TypeScript, React, Node.js, PostgreSQL, Redis, and cloud infrastructure.

EXPERIENCE:
Senior Software Engineer | PayFlow Technologies (2022 - Present)
- Architected a resilient billing and subscription engine processing $18M+ ARR using Node.js, TypeScript, PostgreSQL, and RabbitMQ with 99.99% uptime.
- Reduced payment processing latency by 38% through optimized database indexing, multi-level Redis caching, and connection pooling.
- Designed idempotency middleware for Webhook ingestion handling 4,000+ RPS with zero duplicate charges during partner network retries.
- Mentored 5 junior and mid-level engineers, introduced automated integration testing with Playwright and Jest, increasing code coverage from 62% to 91%.

Full-Stack Software Engineer | CloudScale Systems (2019 - 2022)
- Built interactive analytics dashboards using React 18, Tailwind CSS, TypeScript, and GraphQL, utilized by 45,000+ daily active enterprise users.
- Migrated monolith REST APIs to Go and Node.js microservices deployed on AWS ECS/Fargate, cutting server operating costs by 24%.
- Implemented OAuth2 and RBAC authorization across 14 microservices ensuring SOC2 compliance.

KEY PROJECTS:
1. Distributed Idempotent Payment Router:
   - High-throughput payment routing layer with fallback payment gateways, circuit breaker pattern (Resilience4j style in TypeScript), and automated dispute settlement logging.
   - Technologies: TypeScript, Node.js, Redis, PostgreSQL, Docker, Prometheus.

2. Real-Time Collaborative Canvas:
   - WebRTC & WebSocket collaborative whiteboard supporting 50 simultaneous cursors with operational transformation (CRDT / Yjs).
   - Technologies: React, Canvas API, WebSockets, Redis pub/sub.

SKILLS:
- Languages: TypeScript, JavaScript (ESNext), Go, SQL, HTML5, CSS3/Tailwind
- Frontend: React, Next.js, Redux Toolkit, React Query, WebSockets
- Backend & APIs: Node.js, Express, NestJS, REST, GraphQL, gRPC
- Databases & Queues: PostgreSQL, Redis, MongoDB, Kafka, RabbitMQ
- DevOps & Cloud: Docker, Kubernetes, AWS (S3, ECS, RDS, CloudWatch), CI/CD (GitHub Actions)
- Methodologies: Agile/Scrum, TDD, System Architecture, Distributed Systems Design

EDUCATION:
Bachelor of Science in Computer Science | University of California, Berkeley (2015 - 2019)
`;

  const demoJdText = `Role: Senior Full-Stack Engineer - Billing & Core Infrastructure
Company: Stripe
Location: Remote / San Francisco, CA

ABOUT THE TEAM:
The Billing team builds foundational payments infrastructure that powers global subscriptions, invoicing, and revenue recognition for millions of businesses worldwide.

RESPONSIBILITIES:
- Design, build, and maintain high-availability APIs, distributed workflows, and user-facing dashboards.
- Ensure strict financial accuracy, idempotency, and transactional consistency across distributed systems.
- Collaborate closely with product managers, designers, and customers to deliver delightful developer and end-user experiences.
- Scale our PostgreSQL and caching architecture to support 10x traffic growth.

QUALIFICATIONS & REQUIREMENTS:
- 5+ years of full-stack software development experience.
- Strong proficiency in TypeScript, React, and modern JavaScript frameworks.
- Deep server-side experience with Node.js, Go, or Java building robust microservices.
- Solid understanding of relational databases (PostgreSQL), transaction isolation levels, indexing, and data modeling.
- Hands-on experience with distributed systems concepts: idempotency, message queues (Kafka, RabbitMQ), eventual consistency, and caching (Redis).
- Passion for software quality, automated testing (unit, integration, e2e), and clean code.
- Excellent communication skills and ability to explain complex technical trade-offs.
`;

  const resumeDocId = 'doc-resume-raghav-001';
  const jdDocId = 'doc-jd-stripe-001';

  db.prepare(`
    INSERT INTO documents (id, user_id, document_type, original_filename, mime_type, size_bytes, extracted_text, extraction_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    resumeDocId,
    demoUserId,
    'resume',
    'Raghav_Gupta_Resume.pdf',
    'application/pdf',
    1048576,
    demoResumeText,
    'completed'
  );

  db.prepare(`
    INSERT INTO documents (id, user_id, document_type, original_filename, mime_type, size_bytes, extracted_text, extraction_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jdDocId,
    demoUserId,
    'jd',
    'Stripe_Senior_FullStack_JD.txt',
    'text/plain',
    2048,
    demoJdText,
    'completed'
  );

  const analysisResult = {
    overallMatchScore: 92,
    profileSummary: 'Experienced Senior Full-Stack Engineer with 6+ years specializing in distributed payment architecture, resilient billing microservices, and React frontend systems. Outstanding alignment with Stripe Billing requirements.',
    requirementsMatch: [
      {
        requirement: '5+ years of full-stack software engineering experience',
        status: 'matched',
        evidence: '6+ years experience at PayFlow Technologies (2022-Present) and CloudScale Systems (2019-2022).',
        importance: 'high'
      },
      {
        requirement: 'Strong proficiency in TypeScript, React, and modern frontend frameworks',
        status: 'matched',
        evidence: 'Extensive production experience building dashboards in React 18, TypeScript, Tailwind CSS with 45k+ DAU.',
        importance: 'high'
      },
      {
        requirement: 'Server-side microservices with Node.js / distributed systems',
        status: 'matched',
        evidence: 'Architected billing engine handling $18M+ ARR with Node.js, TypeScript, PostgreSQL, and RabbitMQ.',
        importance: 'high'
      },
      {
        requirement: 'Idempotency and transactional consistency across distributed systems',
        status: 'matched',
        evidence: 'Designed idempotency middleware for Webhook ingestion handling 4,000+ RPS with zero duplicate charges.',
        importance: 'high'
      },
      {
        requirement: 'Deep PostgreSQL knowledge: indexing, transactions, data modeling',
        status: 'matched',
        evidence: 'Reduced latency by 38% via PostgreSQL indexing, connection pooling, and multi-level Redis caching.',
        importance: 'high'
      },
      {
        requirement: 'Hands-on experience with Kafka or event streaming at global scale',
        status: 'partial',
        evidence: 'Listed Kafka in skills and has deep production RabbitMQ experience, but Kafka production scale details are limited in bullet points.',
        importance: 'medium'
      },
      {
        requirement: 'Experience with financial compliance (PCI-DSS / SOC2)',
        status: 'matched',
        evidence: 'Implemented OAuth2 & RBAC across 14 microservices ensuring SOC2 compliance.',
        importance: 'medium'
      }
    ],
    strengths: [
      'Direct domain expertise in payments, billing engines, and webhook idempotency matching Stripe core domain.',
      'Proven performance optimization track record (38% query latency reduction, 4,000+ RPS zero duplicate charges).',
      'Strong end-to-end stack fluency from React 18 dashboards to distributed Node.js/PostgreSQL backend.'
    ],
    gaps: [
      'Concrete Kafka stream processing patterns (e.g. partition balancing, consumer lag recovery) need explicit elaboration.',
      'Global multi-region data replication and active-active failover scenarios not explicitly detailed on resume.'
    ],
    truthfulKeywordSuggestions: [
      'Idempotency Keys & Deduplication Tables',
      'Event-Driven Architecture (EDA)',
      'Distributed Transaction Isolation (Serializable / Read Committed)',
      'Zero-Downtime Database Migrations',
      'Prometheus & OpenTelemetry Metrics'
    ],
    likelyTopics: [
      'Designing an idempotent webhook processing pipeline with retries and dead-letter queues',
      'PostgreSQL concurrency control, row-level locking (SELECT FOR UPDATE), and isolation levels',
      'System design: Scalable subscription billing engine with prorations and meter tracking',
      'React state management for financial data and optimistic UI rollbacks',
      'Behavioral: Resolving technical disagreements on architecture and managing production incidents'
    ],
    studyPlan: [
      { day: 1, focus: 'Payment Idempotency & Webhooks', task: 'Review unique request hashing, Redis lock vs database unique constraint trade-offs, and outbox pattern.' },
      { day: 2, focus: 'PostgreSQL Deep Dive', task: 'Practice transaction isolation anomalies (dirty read, non-repeatable read, phantom read, serialization anomaly) and EXPLAIN ANALYZE.' },
      { day: 3, focus: 'Distributed Caching & Queues', task: 'Revise cache stampede mitigation, write-through vs cache-aside, and message ordering guarantees in RabbitMQ vs Kafka.' },
      { day: 4, focus: 'Stripe System Design Patterns', task: 'Draft architecture for a multi-tenant meter billing service handling 100k events/sec.' },
      { day: 5, focus: 'Project Deep Dive Preparation', task: 'Structure STAR stories for Distributed Idempotent Payment Router: architecture decisions, trade-offs, edge-cases.' },
      { day: 6, focus: 'Behavioral & Leadership Stories', task: 'Refine stories on mentoring junior engineers and navigating production payment incident post-mortems.' },
      { day: 7, focus: 'Full Mock Interview Rehearsal', task: 'Complete Mock 1 (Behavioral) and Mock 2 (Technical) under strict 20-minute timed conditions.' }
    ],
    uncertaintyNotes: [
      'Assumed high familiarity with Kafka based on skills list, but verified evidence is strongest for RabbitMQ and Redis.'
    ]
  };

  const analysisId = 'analysis-raghav-stripe-001';
  db.prepare(`
    INSERT INTO analyses (id, user_id, resume_document_id, jd_document_id, target_role, target_company, result_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    analysisId,
    demoUserId,
    resumeDocId,
    jdDocId,
    'Senior Full-Stack Engineer',
    'Stripe',
    JSON.stringify(analysisResult),
    'completed'
  );

  // Seed sample completed interview session
  const sessionId = 'session-raghav-001';
  db.prepare(`
    INSERT INTO interview_sessions (
      id, user_id, analysis_id, session_type, mode, status, target_duration_seconds,
      started_at, ended_at, duration_seconds, ended_early, final_report_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    demoUserId,
    analysisId,
    'technical',
    'text',
    'completed',
    1200,
    new Date(Date.now() - 3600000).toISOString(),
    new Date(Date.now() - 2400000).toISOString(),
    1200,
    0,
    JSON.stringify({
      overallScore: 4.6,
      summary: 'Exceptional performance on distributed systems, payment idempotency, and database concurrency. Strong articulation of architectural trade-offs.',
      categoryScores: {
        technicalCorrectness: 4.8,
        relevance: 4.7,
        completeness: 4.5,
        structure: 4.6,
        communicationClarity: 4.7,
        grammarVocabulary: 4.8,
        conciseness: 4.4,
        projectEvidence: 4.6
      },
      strengths: [
        'Precise explanation of idempotency keys with unique database constraint fallback.',
        'Strong awareness of transactional isolation hazards in payment balance mutations.'
      ],
      improvementAreas: [
        'Can provide more quantitative metrics on cache hit ratios when discussing Redis.'
      ]
    })
  );

  // Turn 1
  db.prepare(`
    INSERT INTO interview_turns (
      id, session_id, sequence_no, question_text, question_category, question_metadata,
      answer_text, feedback_json, asked_at, answered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'turn-raghav-001',
    sessionId,
    1,
    'In your billing engine at PayFlow Technologies, how did you guarantee zero duplicate charges when third-party webhooks were retried concurrently?',
    'TECHNICAL',
    JSON.stringify({ difficulty: 'advanced', topic: 'Idempotency & Concurrency' }),
    'We implemented an idempotency key layer at our API gateway. Each webhook payload came with an event ID which we used as an idempotency key. We stored this in Redis with an atomic SETNX and a 24-hour TTL to prevent concurrent processing. Furthermore, in PostgreSQL, we had a unique constraint on (idempotency_key) in our processed_events table. If two requests raced past Redis, the second transaction failed with a unique key violation and safely rolled back without executing the payment capture.',
    JSON.stringify({
      scores: {
        technicalCorrectness: 5,
        relevance: 5,
        completeness: 4.5,
        structure: 4.5,
        communicationClarity: 5,
        grammarVocabulary: 5,
        conciseness: 4.5,
        projectEvidence: 5
      },
      whatWorked: [
        'Clear two-tier defense: fast-path Redis atomic check + authoritative PostgreSQL unique constraint.',
        'Directly tied the explanation to real production database concepts.'
      ],
      missingPoints: [
        'Could briefly mention how in-flight requests were handled while the first request was still executing (e.g. returning 409 Conflict or waiting on a promise/lock).'
      ],
      technicalCorrections: [],
      grammarSuggestions: [],
      improvedAnswer: 'We implemented a defense-in-depth idempotency strategy. When a webhook arrives, we first execute an atomic SETNX in Redis with a 24-hour TTL and "IN_PROGRESS" status. If the key exists, subsequent requests immediately receive a 409 or poll for the result. When the transaction succeeds, we update the status and commit an entry to our PostgreSQL processed_events table with a UNIQUE (idempotency_key) constraint. Even in the rare event of a Redis partition, database row constraints ensure duplicate payment captures are impossible.',
      practiceTask: 'Review PostgreSQL advisory locks as an alternative coordination mechanism for distributed job workers.',
      suggestedFollowUp: 'What happens if the primary worker crashes midway after acquiring the Redis lock but before committing to Postgres?'
    }),
    new Date(Date.now() - 3500000).toISOString(),
    new Date(Date.now() - 3300000).toISOString()
  );

  // Seed initial coach conversation
  const convoId = 'convo-raghav-001';
  db.prepare(`
    INSERT INTO coach_conversations (id, user_id, title)
    VALUES (?, ?, ?)
  `).run(convoId, demoUserId, 'Stripe Billing System Architecture Preparation');

  db.prepare(`
    INSERT INTO coach_messages (id, conversation_id, role, content)
    VALUES (?, ?, ?, ?)
  `).run(
    'msg-001',
    convoId,
    'user',
    'How should I frame my 6 years of experience when interviewing for the Senior Full-Stack role at Stripe?'
  );

  db.prepare(`
    INSERT INTO coach_messages (id, conversation_id, role, content)
    VALUES (?, ?, ?, ?)
  `).run(
    'msg-002',
    convoId,
    'assistant',
    'Raghav, your background at PayFlow Technologies is exceptionally well-aligned with Stripe Billing! Focus on three pillars:\n\n1. **Financial Integrity & Reliability**: Highlight your $18M+ ARR billing engine and your zero-duplicate charge guarantee under 4,000 RPS. Stripe cares deeply about precision and fault tolerance.\n2. **PostgreSQL & Database Craft**: Emphasize how you reduced latency by 38% through indexing and multi-tier Redis caching. Connect this to scaling relational databases for high-velocity transactions.\n3. **Full-Stack Polish**: Show that you are not just a backend engineer; your React 18 dashboards for 45,000 DAU demonstrate end-to-end user empathy.\n\nWould you like to practice explaining your Distributed Idempotent Payment Router using the STAR method?'
  );

  // Seed audit event
  db.prepare(`
    INSERT INTO audit_events (id, user_id, event_type, metadata_json)
    VALUES (?, ?, ?, ?)
  `).run(
    'audit-001',
    demoUserId,
    'USER_REGISTERED',
    JSON.stringify({ email: 'raghav@example.com', source: 'seed' })
  );
}
