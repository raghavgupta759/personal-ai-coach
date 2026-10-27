# Architecture and Implementation Notes

## Recommended logical architecture
Browser UI → authenticated server/API → application services → database/private file storage → AI/search/PDF adapters.

Keep provider-specific code behind interfaces so the app can swap models/search vendors without changing product logic.

## Main modules
- `auth`: registration, login, logout, password reset, session.
- `profile`: name, target role/company, preferences.
- `documents`: secure upload, parsing, text preview/edit, retention.
- `analysis`: resume/JD comparison, evidence map, preparation plan.
- `company_research`: public search, source normalization, citations.
- `interviews`: session lifecycle, question selection, answer submission, timers.
- `feedback`: rubric evaluation, rewrite suggestions, learning tasks.
- `coach_chat`: user-scoped context retrieval and conversation.
- `study_pack`: PDF generation, storage, download authorization.
- `history`: sessions, analysis history and progress.
- `audit`: security-relevant events without sensitive document contents.

## AI adapter contracts
### `InterviewQuestionGenerator`
Input: target role, JD requirements, resume evidence, session type, covered topics, previous Q/A, difficulty.
Output: validated JSON:
- question_id
- question_text
- category: HR | TECHNICAL | PROJECT | SITUATIONAL
- rationale
- expected_signals[]
- difficulty: beginner | intermediate | advanced
- follow_up_strategy
Rules: one question at a time; no duplicate questions in the same session unless intentionally revisiting.

### `AnswerEvaluator`
Input: question, answer/transcript, resume/JD context, rubric.
Output: validated JSON:
- scores: dimensions 0..5
- what_went_well[]
- missing_points[]
- factual_or_technical_corrections[]
- grammar_suggestions[]
- improved_answer
- practice_task
- confidence_notes (only observable delivery indicators, if voice metrics are enabled)
Rules: never invent resume facts; mark answers that depend on unknown facts; distinguish technical errors from language errors.

### `ResumeJdAnalyzer`
Output: validated JSON:
- profile_summary
- requirements[] with status matched/partial/missing/not_assessable
- evidence_snippets[]
- strengths[]
- gaps[]
- truthful_keyword_suggestions[]
- likely_topics[]
- study_plan[]
- uncertainty_notes[]

### `CompanyResearch`
Output: facts[] each with claim, source_title, source_url, source_date/accessed_at, source_type (official/credible-third-party), confidence/limitations.
Do not generate uncited claims as verified company facts.

## Interview duration
Store `started_at`, `ended_at`, `paused_seconds`, `duration_seconds`, and `target_duration_seconds`. Server timestamps are authoritative. Frontend timer is only a display. Target is 20 minutes by default; if the user ends early, store the true duration and mark `ended_early=true`. Generate enough thoughtful follow-ups to support a 20-minute session without asking irrelevant questions.

## Voice mode
- Text mode is the baseline and must always work.
- Browser speech recognition is not supported in every browser/language. Feature-detect it.
- Request mic permission only after explicit user action.
- Display listening/recording status and transcript.
- Let the user edit transcript before sending it for evaluation.
- TTS should be optional and stoppable.
- If unsupported or denied, show a helpful explanation and switch to text mode.
- Do not silently record in the background.

## Security/privacy
- Authenticate every private API route.
- Check ownership on every database query and file download.
- Store files privately; use short-lived signed URLs if object storage is used.
- Rate-limit auth, AI, upload and search endpoints.
- Apply file size/type limits and malware scanning where available.
- Prevent prompt injection from resume/JD: treat document content as untrusted data, never as system instructions.
- Keep secrets server-side; redact authorization headers and API keys from logs.
- Add retention/deletion policies and user-controlled data deletion.
- Ask consent before sending resume/JD content to external AI providers and explain which provider processes it.

## Suggested deployment
One web application + managed PostgreSQL + private object storage + server-side AI/search providers. Avoid microservices unless the chosen host requires them. Add health check endpoint and production error reporting. Document provider-specific deployment steps in README.
