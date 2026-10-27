-- Reference PostgreSQL schema. Adapt names/types to the chosen ORM.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  target_role VARCHAR(180),
  target_company VARCHAR(180),
  experience_level VARCHAR(40),
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('resume','jd')),
  original_filename TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  private_storage_key TEXT,
  extracted_text TEXT,
  extraction_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_user_idx ON documents(user_id, created_at DESC);

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  resume_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  jd_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  target_role VARCHAR(180),
  target_company VARCHAR(180),
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_provider VARCHAR(80),
  prompt_version VARCHAR(40),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analyses_user_idx ON analyses(user_id, created_at DESC);

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  session_type VARCHAR(30) NOT NULL CHECK (session_type IN ('hr','technical','project_mixed')),
  mode VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (mode IN ('text','voice')),
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  target_duration_seconds INTEGER NOT NULL DEFAULT 1200,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  paused_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  ended_early BOOLEAN NOT NULL DEFAULT false,
  final_report_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX interviews_user_idx ON interview_sessions(user_id, created_at DESC);

CREATE TABLE interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_category VARCHAR(30) NOT NULL,
  question_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer_text TEXT,
  transcript_edited BOOLEAN NOT NULL DEFAULT false,
  feedback_json JSONB,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  UNIQUE(session_id, sequence_no)
);

CREATE TABLE coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coach_conversations_user_idx ON coach_conversations(user_id, updated_at DESC);

CREATE TABLE coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system_summary')),
  content TEXT NOT NULL,
  citations_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE study_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  private_storage_key TEXT,
  title TEXT NOT NULL,
  source_manifest_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_packs_user_idx ON study_packs(user_id, created_at DESC);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Never store passwords, API keys, full resume text, or raw transcripts in audit metadata.
