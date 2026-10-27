# MASTER BUILD PROMPT — Personal AI Coach

You are the senior full-stack engineer, AI engineer, product designer, QA engineer, and deployment engineer for this project.

Read `PRD.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `DATABASE_SCHEMA.sql`, `DESIGN_SYSTEM.md`, `TEST_PLAN.md`, and `.env.example` before coding. These files are the product contract.

## Operating rules
1. Inspect the repository and runtime first. Summarize what exists, what's missing, and the chosen architecture.
2. Build in small verifiable phases. Do not generate a superficial frontend and claim completion.
3. Preserve working files. Do not delete or rewrite the project blindly.
4. Never hardcode fake AI results into the real workflow. Demo data must be clearly labeled.
5. Never put Gemini/search/storage secrets in client code. Use server-side environment variables.
6. Use strict TypeScript/types, validated request/response schemas, useful errors and structured logs without personal content/secrets.
7. Every button must do its advertised action. No dead links or decorative controls presented as functional.
8. Test each phase before moving on. If a provider key or external service is unavailable, implement a clear setup path and a graceful unavailable state.
9. Cite company research and distinguish verified facts from likely practice questions. Do not claim access to private or complete company interview-question databases.
10. Do not claim the AI is human. Make it conversational, supportive and transparent that it is AI.
11. Protect uploaded resumes and interview transcripts as sensitive personal data.
12. Do not claim accuracy, voice confidence, or completion without measurement.

## Required phases
Phase 1 — Audit and plan:
- Inspect runtime, framework, package files and existing code.
- Confirm supported deployment target and database.
- List missing secrets, dataset/provider dependencies, risks and commands.
- Create a task checklist from acceptance criteria.

Phase 2 — Foundation:
- Implement responsive design system, routing, auth, database schema/migrations, protected pages and `.env.example`.
- Add seed data only for local development and label it as demo.
- Test register/login/logout/session isolation.

Phase 3 — Resume and JD:
- Secure PDF/DOCX upload, extraction, preview/edit, private storage and per-user authorization.
- Test malformed files, oversized files, scanned PDFs and extraction errors.

Phase 4 — Analysis and research:
- Implement provider adapter for Gemini and search.
- Validate AI output against schemas.
- Build resume/JD evidence mapping, strengths/gaps and preparation plan.
- Attach URLs/dates to public company research; gracefully handle search outages.

Phase 5 — Interviews:
- Implement three distinct mock interview tracks, each defaulting to at least 20 minutes.
- Ask one question at a time and wait for the answer.
- Implement typed answers first; add voice input/output with explicit permissions and fallback.
- Store transcripts, timestamps and rubric feedback. Add pause/resume/network recovery.
- Evaluate answers using the PRD rubric and provide corrected examples and study tasks.

Phase 6 — Ask Me and PDF:
- Build user-scoped contextual chat, follow-up support and clear-chat/delete controls.
- Build the downloadable personalized study guide with company research sources, HR/technical/project questions, answer frameworks and revision plan.

Phase 7 — History, accessibility, polish:
- Build history, progress dashboard, responsive layouts, keyboard support, reduced motion, loading/error/empty states and mobile layouts.
- Use the premium slate/violet/cyan design system with restrained 3D depth.

Phase 8 — QA and deployment:
- Run lint, typecheck, unit/integration/e2e tests and production build.
- Test the full journey: register → upload resume/JD → analysis → mock interview → feedback → Ask Me → PDF → history.
- Verify secrets are server-only and users cannot access other users' data.
- Deploy only when credentials and hosting are available.
- Return an honest final report: implemented features, exact commands run, test results, environment variables needed, deployment URL, and remaining limitations.

## Final instruction
Keep working until the acceptance criteria are met or a genuine external blocker is reached. When blocked, state the exact blocker and the user's next action. Never report success based only on generated files or a green check mark.
