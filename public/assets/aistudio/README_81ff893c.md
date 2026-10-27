# Personal AI Coach — Project Pack

This folder contains the product specification and implementation contracts for a full-stack AI interview coach.

## Included files
- `PRD.md` — full product requirements, user journeys, functional requirements and acceptance criteria.
- `AGENT_PROMPT.md` — phased master prompt for a coding agent.
- `ARCHITECTURE.md` — service boundaries, AI contracts, voice, security and deployment guidance.
- `API_SPEC.md` — suggested HTTP API contract.
- `DATABASE_SCHEMA.sql` — reference PostgreSQL schema.
- `DESIGN_SYSTEM.md` — premium UI/UX and accessibility direction.
- `TEST_PLAN.md` — QA and release gates.
- `.env.example` — environment-variable template; contains no real credentials.

## How to use with an AI coding agent
1. Upload the entire ZIP or extracted folder to the agent.
2. Tell it to read `AGENT_PROMPT.md` first, then all specification files.
3. Give the agent the required runtime and repository permissions.
4. Configure secrets in the platform's server-side secret manager or local `.env` file; never paste real keys into public source files.
5. Ask it to implement phase-by-phase and report test output before claiming completion.

## Suggested implementation order
1. Audit repository/runtime and select a coherent stack.
2. Auth + database + responsive shell.
3. Resume/JD upload and text extraction.
4. Analysis and sourced company research.
5. Three mock interview tracks and feedback.
6. Ask Me contextual chat.
7. PDF study pack and history.
8. Tests, accessibility, security audit and deployment.

## Important limitations
- AI responses can be wrong; display uncertainty and let users correct extracted text.
- Voice features vary by browser/device; text mode must always work.
- Company-specific questions must not be falsely presented as verified historical questions.
- The app must not promise a job, guaranteed accuracy, or objectively measured psychological confidence.
- Deployment needs valid provider credentials, database and hosting configuration. The pack is a specification, not a pre-built application.
