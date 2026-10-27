# Personal AI Coach — UI/UX and Design System

## Brand
- Product: Personal AI Coach
- Feel: premium, encouraging, calm, intelligent, focused.
- Visual idea: dark slate workspace with violet/cyan highlights and subtle dimensional depth.

## Palette (suggested tokens)
- `--bg`: #0B1020
- `--surface`: #121A2B
- `--surface-raised`: #1A2438
- `--text`: #F4F7FB
- `--text-muted`: #A8B3C7
- `--primary`: #8B5CF6
- `--accent`: #22D3EE
- `--success`: #34D399
- `--warning`: #FBBF24
- `--danger`: #FB7185
Maintain WCAG AA contrast for normal text; adjust exact shades if required.

## Layout
- Desktop: left sidebar (Dashboard, My Analysis, Mock Interviews, Ask Me, Study Packs, History, Settings), central content, optional right rail for readiness/next action.
- Mobile: compact top bar and bottom navigation; all forms usable without horizontal scrolling.
- Landing page: clear headline, product preview, benefits, privacy note and CTA.
- Auth pages: elegant centered panel, clear validation, password visibility, forgot password and link between login/register.
- Dashboard greeting: use stored profile name, e.g. “Good evening, Raghav”; fallback to “Welcome back”.
- Dashboard widgets: preparation readiness (practice indicator, not hiring probability), next recommended step, last session, weekly plan, progress graph.
- Upload workspace: two clear cards for Resume and Job Description, drag/drop plus browse, accepted types/size, parse preview and edit.
- Analysis page: requirement match table, strengths, gaps, topic priorities, sources and preparation plan.
- Interview room: question panel, timer, progress, answer composer, mic button (only if supported), submit, repeat question, pause/end controls. Make end-interview confirmation explicit.
- Feedback: score rubric, evidence, corrections, improved answer, practice task and “continue” CTA.
- Ask Me: conversational chat, contextual chips (resume, JD, last interview), sources/uncertainty, clear conversation.
- Study pack: table of contents, generation status, PDF preview/download and citations.
- History: filter by date/session type and compare previous practice scores.

## Components
Buttons (primary/secondary/destructive), input fields, password field, upload dropzone, cards, progress stepper, status badges, score bars, citations, transcript editor, timer, chat bubbles, modal, toast, skeletons, empty/error states.

## Motion and 3D
- Use restrained layered gradients, soft shadows, hover lift of 2–4px, subtle animated orb/mesh on landing only.
- Avoid continuous heavy 3D rendering that harms laptop/mobile performance.
- Respect `prefers-reduced-motion`; provide a static fallback.
- Do not use motion for critical status changes without text labels.

## Accessibility
- Semantic headings, labels, keyboard navigation, visible focus ring, screen-reader announcements for timer/state changes.
- Never rely on color alone.
- Voice controls require explicit click and clear recording indicator.
- Captions/transcripts must be visible and editable.
- Keep text contrast and comfortable line lengths.
