# Personal AI Coach — Product Requirements Document (PRD)
**Version:** 1.0  
**Purpose:** Build a deployable, full-stack, AI-powered interview preparation platform.

## 1. Product vision
Personal AI Coach helps a job seeker prepare for a specific role/company using their resume and a job description (JD). It provides a personalized preparation plan, three structured mock interviews, live voice or text answers, actionable feedback, a conversational “Ask Me” coach, and downloadable study packs.

The product should feel warm, intelligent, polished, and human-like without pretending that the AI is a real human or guaranteeing hiring outcomes.

## 2. Primary users and user stories
- A new user can register using name, email, and password, verify their email if supported, and securely sign in later.
- A returning user can sign in and see a personalized greeting, e.g. “Good evening, Raghav”.
- A user can upload a PDF/DOCX resume and paste or upload a job description.
- A user can review/edit extracted resume and JD text before analysis.
- The AI can build a profile of skills, projects, experience, gaps, role requirements, and preparation priorities.
- A user can take three mock interviews tailored to the resume, role, JD, and company information.
- Each interview lasts at least 20 minutes by default, unless the user explicitly ends it early. The system should track elapsed time and ask follow-up questions rather than padding with irrelevant questions.
- A user can answer by typing or speaking. Speech-to-text is used for voice answers; text-to-speech may read questions aloud.
- After each answer, the coach gives feedback on correctness, relevance, structure, grammar, clarity, filler words, and delivery. Confidence is estimated only from observable proxies (e.g. pace, pauses, answer structure); do not claim to measure a person's inner confidence from text alone.
- The user can open Ask Me and ask questions using their saved resume, JD, interview history, and preparation notes as context.
- The user can generate and download a PDF study guide containing technical and HR questions/answers, project-specific questions, company research, and a revision plan.
- A user can view previous analyses, mock interviews, feedback, generated PDFs, and progress history.
- A user can delete their account and data.

## 3. Scope
### MVP — required
1. Authentication: register, login, logout, protected routes, secure password hashing, session management, account profile.
2. Dashboard: personalized greeting, readiness snapshot, next steps, recent sessions, progress history.
3. Resume upload: PDF/DOCX, file size and MIME validation, text extraction, extraction preview and correction.
4. Job description: paste text or upload PDF/DOCX, extraction preview and correction.
5. Analysis: resume/JD match, evidence-based skill mapping, strengths, gaps, ATS keyword suggestions, missing requirements, tailored preparation plan.
6. Company research: search web for verifiable public facts using a search provider (e.g. DuckDuckGo search library/provider); cite URLs and dates. If search is unavailable, clearly label content as unverified and ask the user to provide links.
7. Mock interviews: three sessions with separate objectives:
   - Mock 1: HR, motivation, behavioral, communication.
   - Mock 2: role-specific technical skills, concepts, scenario questions.
   - Mock 3: resume/project deep dive, mixed technical + HR, follow-up questions.
   Question selection must be based on resume, JD, role, and session coverage. Do not claim to know every question a company has asked. Label company questions as publicly reported examples with source links where available.
8. Interview interaction: typed answers and optional microphone mode; question text, timer, progress, pause/resume, repeat question, end interview, accessibility controls.
9. Feedback: answer-specific score rubric, evidence, corrections, improved sample answer, learning tasks and next question.
10. Ask Me: contextual text chat; optional voice input/output; conversation history.
11. Study pack: generated PDF with role-specific technical questions, HR questions, project questions, model answer outlines, company overview, source links, glossary, revision checklist and personalized study plan.
12. History: analyses, sessions, scores, improvement trends, PDF downloads.
13. Settings: profile, language preference, data export/delete, privacy controls.
14. Responsive and accessible UI with polished 3D-inspired visuals, reduced-motion support, loading/error/empty states.
15. Deployment docs, tests, logging, monitoring, and secure environment configuration.

### Post-MVP (only after MVP works)
- Calendar reminders, interview streaks, additional languages, interviewer personas, resume version comparison, mentor/admin tools, payment plans.
- Real-time voice conversation only if the chosen provider supports stable streaming and browser permissions are implemented safely.

## 4. Non-goals and honest limitations
- Do not guarantee a job, ATS pass, perfect prediction, or perfect grammar/confidence assessment.
- Do not scrape private websites, bypass logins, or present leaked interview questions.
- Do not invent company facts, question history, salary, or hiring processes. Public company-specific questions must have source URLs and dates; otherwise mark them as likely practice questions, not actual past questions.
- Do not make medical, psychological, or personality diagnoses.
- Do not claim voice emotion analysis is objectively accurate. Voice-based delivery metrics are optional and must be disclosed.
- Do not expose API keys in client-side code or logs.
- Do not silently use uploaded personal data to train models.

## 5. UX flow
1. Landing page → Register/Login.
2. New account → onboarding (name, target role, target company, experience level, preferred language).
3. Dashboard → create preparation workspace.
4. Upload resume → parse → preview/edit extracted text.
5. Add JD by paste/upload → preview/edit.
6. Analyze → progress indicator with clear stages → results and citations.
7. Review role match and personalized learning plan.
8. Start Mock 1/2/3 → choose voice or text → 20-minute session → questions and adaptive follow-ups.
9. End session → detailed scorecard and practice tasks.
10. Ask Me → contextual chat.
11. Generate study pack → preview → download PDF.
12. History/dashboard → review progress and repeat practice.

## 6. Functional requirements
### FR-01 Authentication
- Register with name, email, password; validate email format and password policy.
- Store only salted password hashes using a proven library (e.g. Argon2id or bcrypt).
- Use secure, HttpOnly, SameSite cookies for browser sessions where possible; CSRF protection where applicable.
- Rate-limit login and password reset; generic error messages must not reveal whether an email exists.
- Add logout, password reset flow, protected API routes, and account deletion.
- Never store passwords in localStorage or logs.

### FR-02 File ingestion
- Accept PDF and DOCX; optional TXT. Limit file size (configurable, default 10 MB).
- Validate file extension, MIME type and actual file signature; sanitize file names.
- Parse files server-side. Do not execute macros or embedded content.
- For scanned PDFs, explain that OCR is required; use an OCR provider only if configured and disclose processing.
- Show extracted text preview and let the user fix parsing mistakes before analysis.
- Store files privately; use random storage keys, not public URLs. Enforce per-user authorization.
- Delete temporary files after parsing if persistent storage is not needed.

### FR-03 Resume/JD analysis
- Extract facts with source spans or quote snippets from the uploaded text.
- Separate facts from inferences. Never invent degrees, years of experience, tools, metrics, or project outcomes.
- Compare requirements to resume evidence: `matched`, `partial`, `missing`, `not_assessable`.
- Provide strengths, gaps, keywords to include only if truthful, likely interview topics, and a 7-day or configurable study plan.
- Use structured JSON schema validation for AI output; retry once on malformed output, then return a safe error.
- Store model/provider, prompt version, timestamp, and source citations for traceability.

### FR-04 Company research
- Use a search adapter so provider can be changed without rewriting business logic.
- Search official company pages first, then reputable public sources.
- Return source title, URL, publication/access date, and concise fact summary.
- Distinguish official facts, third-party reporting, and AI-generated preparation hypotheses.
- Do not represent example practice questions as verified questions asked by the company unless a credible public source explicitly supports that claim.

### FR-05 Interview engine
- Three sessions must have clear goals and different question coverage.
- Default duration: 20 minutes. Show elapsed and remaining time; use question depth/follow-ups to fill the time naturally.
- Generate one question at a time; wait for the user's answer before asking the next.
- Adapt follow-up difficulty to the answer and previous answers.
- Allow text answer always; voice is optional and browser/device dependent.
- For voice: ask microphone permission clearly; show recording state; allow stop/re-record; transcribe and show transcript for correction before scoring.
- If speech APIs are unavailable, fall back to text without breaking the session.
- Save transcript, question, answer, feedback, timestamps, and rubric results.
- Pause/resume and recover from network errors without losing the current answer.
- User may end early; label it as ended early and do not falsely report a full 20-minute session.

### FR-06 Feedback rubric
Score each dimension 0–5 with explanation and evidence:
- Technical correctness (when relevant)
- Relevance to question/JD
- Completeness and reasoning
- Structure (e.g. STAR for behavioral questions)
- Communication clarity
- Grammar and vocabulary (for English answers)
- Conciseness
- Project/resume evidence
Do not combine all dimensions into a misleading “scientific confidence score.” If displaying an overall score, show its calculation and label it as practice feedback, not a hiring probability.
Feedback format: what worked, what was missing, corrected wording, example improved answer, one practice task, suggested follow-up.

### FR-07 Ask Me assistant
- Context must be scoped to the authenticated user's own resume, JD, analysis, interview history and study pack.
- Use retrieval/selected context, not an unlimited prompt containing all private data every turn.
- Support follow-up questions and explain the reasoning in plain language; cite source facts when available.
- Do not expose another user's data. Apply per-user authorization at database and retrieval layers.
- Provide “clear chat” and data deletion controls.
- Chat answers must disclose uncertainty and ask clarifying questions where needed.

### FR-08 PDF study pack
PDF includes:
1. User name, target role/company and generation date.
2. Company overview with source links and research date.
3. JD requirement map and resume strengths/gaps.
4. 15–25 role-specific technical questions and answer outlines (quantity configurable).
5. 8–12 HR/behavioral questions with STAR answer frameworks tailored only to provided evidence.
6. Resume/project deep-dive questions based on each actual project.
7. Important concepts and revision checklist.
8. Personalized 7-day plan.
9. Sources, caveats and “practice answers must be adapted to your real experience.”
Use reportlab or a stable server-side PDF library; handle long text, page breaks, Unicode and links. PDF generation failure must not lose interview data.

### FR-09 History and progress
- Show date, role/company, session type, duration, completion state and scores.
- Show trends only when enough data exists; do not imply statistical significance from a few sessions.
- Allow deletion of a session and associated generated files.
- Export data and delete account.

## 7. Design direction
- Product name: Personal AI Coach.
- Visual theme: premium dark slate/navy with electric violet/cyan accents, subtle gradients, glass panels, soft depth and restrained 3D illustrations.
- Avoid visual clutter, excessive glow and slow animations.
- Use a clear dashboard, strong typography, generous spacing, responsive cards and visible focus states.
- Use Framer Motion or CSS transitions only if compatible with the selected stack.
- Include reduced-motion mode and keyboard navigation.
- Landing/login/register should be polished; after login show a personalized greeting using the account profile.
- Provide skeletons, progress stages, empty states, toasts, confirmation dialogs and recoverable errors.
- Never make a 3D effect reduce text contrast or accessibility.

## 8. Suggested technology stack
Choose a coherent stack and do not mix frameworks unnecessarily:
- Frontend: Next.js + TypeScript + Tailwind CSS + accessible component library.
- Backend: Next.js server routes or FastAPI; choose one primary backend and document why.
- Database: PostgreSQL with Prisma/SQLAlchemy.
- Auth: Auth.js or a well-maintained authentication library.
- File storage: private object storage (S3-compatible) or private local storage for development.
- AI: Gemini API via server-side adapter; optional second provider behind same interface.
- Search: DuckDuckGo search adapter or another provider with compliant access; citations and graceful fallback required.
- PDF: reportlab (Python) or a stable JS PDF library.
- Speech: browser Web Speech API where supported, with text fallback; optional provider-based STT/TTS.
- Deployment: frontend/backend/database/storage deployment documented with exact environment variables.

Agent must first inspect existing environment and choose the smallest reliable architecture. Do not create unnecessary microservices.

## 9. Acceptance criteria
- A new user can register, log in, log out, and access only their own workspace.
- A returning user sees a personalized greeting.
- PDF/DOCX resume and JD can be parsed, previewed and edited.
- Analysis produces validated structured results and marks uncertainty.
- All three interview types run end-to-end and ask one question at a time.
- A standard mock interview runs for at least 20 minutes unless the user ends early; session timing is recorded correctly.
- Text mode works in all supported browsers; voice mode gracefully falls back when unavailable.
- Each answer receives rubric-based feedback and a practical improvement suggestion.
- Ask Me uses the user's own authorized context and supports follow-ups.
- PDF study pack downloads successfully with source links and role-specific sections.
- History persists after logout/login.
- API keys remain server-side and are absent from built frontend bundles.
- Automated tests cover auth, authorization, uploads, analysis schema, session progression, feedback and PDF generation.
- No critical console/server errors in the main user journey.
- README documents local setup, test, model/provider setup and deployment.
- Report real test results; do not mark unchecked requirements as complete.

## 10. Delivery checklist
- Complete source code and lockfile.
- Database schema and migrations.
- `.env.example` without real secrets.
- Seed/demo data clearly marked as fake.
- Unit, integration and end-to-end tests.
- README and deployment guide.
- Threat/privacy notes.
- AI prompt templates and versioning.
- PDF generator and example PDF.
- Final audit: run commands, test output, known limitations and exact deployment URL if deployed.
