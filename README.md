# Personal AI Coach — Full-Stack AI Interview Intelligence Platform

Personal AI Coach is a full-stack, deployable interview preparation platform engineered to prepare job candidates with evidence-based resume/job description analysis, three 20-minute adaptive mock interview tracks, 8-dimension rubric evaluations, a conversational AI coach, and downloadable study packs.

---

## 🌟 Key Capabilities

1. **Evidence-Based Resume & Job Description Intelligence**
   - Ingests PDF and DOCX resumes, extracts text, and provides inline editing before running comparison.
   - Compares qualifications against candidate evidence: `Matched`, `Partial`, `Missing`, `Not Assessable`.
   - Never fabricates qualifications, degrees, dates, or metrics.
   - Generates a tailored 7-day preparation roadmap and identifies truthful keywords.

2. **Three Realistic 20-Minute Mock Interview Tracks**
   - **Track 1: HR & Behavioral** — Motivation, culture alignment, teamwork, and STAR situational questions.
   - **Track 2: Technical & Architecture** — Concurrency, database isolation, distributed systems, caching, and code craftsmanship.
   - **Track 3: Resume & Project Deep Dive** — Investigates actual projects, architecture trade-offs, bug triage, and scale metrics from the candidate's resume.
   - **Timing & Controls**: Authoritative server-side 20-minute timer, countdown display, pause/resume, repeat question, and honest early exit tracking.
   - **Dual Modality**: Works with typed answers and microphone voice input (with editable transcript before submission). Question audio read-aloud via TTS.

3. **8-Dimension Rubric Scorecard After Every Answer**
   - Technical Correctness (0.0 – 5.0)
   - Relevance to Question & JD (0.0 – 5.0)
   - Completeness & Reasoning (0.0 – 5.0)
   - Answer Structure / STAR (0.0 – 5.0)
   - Communication Clarity (0.0 – 5.0)
   - English Grammar & Vocabulary (0.0 – 5.0, separated from technical scores)
   - Conciseness (0.0 – 5.0)
   - Project & Resume Evidence (0.0 – 5.0)
   - Actionable output: What worked, missing points, improved sample answer, and practical study task.

4. **Ask Me: Personal AI Coach**
   - Contextual chat assistant grounded strictly in the authenticated user's uploaded resume, JD, analysis, and interview mistakes.
   - Includes citation tags and suggested follow-up prompts.

5. **Sourced Company Research Hub**
   - Queries public company facts (founding, products, tech stack, and values).
   - Strict source attribution with titles, URLs, and access dates.
   - Discloses simulated practice questions without falsely representing them as actual leaked questions.

6. **Downloadable PDF Study Guide**
   - Multi-page study pack with company overview, requirement match, 15+ technical questions, behavioral STAR frameworks, 7-day schedule, and revision checklists.

7. **History & Settings**
   - Full session replay, transcripts, score trends, data export (JSON), and account deletion.

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend API**: Node.js v22 with Express REST endpoints
- **Database**: Persistent local SQLite via `node:sqlite` DatabaseSync (`data/personal_ai_coach.db`)
- **AI Engine**: `@google/genai` TypeScript SDK with `gemini-3.8-flash` (server-side only)
- **PDF Generation**: `jspdf`
- **Document Ingestion**: `pdf-parse`, `mammoth` (DOCX), and multipart handling via `multer`
- **Authentication**: Salted password hashing via `bcryptjs` and secure session tokens

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is set. When running in Google AI Studio, this is injected automatically from the Secrets panel.

### 3. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

### 4. Demo Account
For instant verification without registration:
- **Email**: `raghav@example.com`
- **Password**: `Password123!`
- Or click the **Explore Live Demo Profile** button on the landing page.

---

## 🧪 Testing & Verification

### Run Unit Tests
```bash
npm test
```
Executes test suite using `node:test` covering:
- Database schema initialization and seed isolation
- Session creation, retrieval, and revocation
- Company research and DuckDuckGo search integration
- Multi-page PDF study pack generation

### Run Linter
```bash
npm run lint
```

### Build Production Bundle
```bash
npm run build
```

---

## 🔒 Security & Privacy

- **Server-Only API Keys**: `GEMINI_API_KEY` is never bundled into client assets or exposed in network payloads.
- **Per-User Isolation**: Every document, analysis, interview session, and chat conversation is scoped by authenticated user ID.
- **Untrusted User Data**: Resume and job description text is treated as raw data, never as system instructions.
- **Ethical AI**: Transparent disclosures that the coach is an AI simulation. No false claims of psychological confidence detection or guaranteed job offers.
