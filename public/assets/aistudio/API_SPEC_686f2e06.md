# API Contract (adapt route naming to chosen framework)

All private endpoints require an authenticated session. Return consistent JSON errors such as `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`. Never return stack traces or secrets to clients.

## Authentication
- `POST /api/auth/register` — `{name,email,password}` → user profile/session.
- `POST /api/auth/login` — `{email,password}` → session.
- `POST /api/auth/logout` — invalidate session.
- `POST /api/auth/password-reset/request` — generic success response.
- `POST /api/auth/password-reset/confirm` — token + new password.
- `GET /api/me` — current profile.
- `PATCH /api/me` — update profile/preferences.
- `DELETE /api/me` — delete account and associated data after confirmation.

## Documents
- `POST /api/documents/resume` — multipart file → `{documentId,status,extractedTextPreview}`.
- `POST /api/documents/jd` — multipart file or JSON text → document.
- `PATCH /api/documents/:id/text` — save user-corrected extracted text.
- `GET /api/documents/:id` — metadata and authorized preview.
- `DELETE /api/documents/:id` — delete document and dependent data per retention policy.

## Analysis/research
- `POST /api/analysis` — `{resumeDocumentId,jdDocumentId,targetRole,targetCompany}` → `{analysisId,status}`.
- `GET /api/analysis/:id` — structured result.
- `POST /api/company-research` — `{company,role}` → sourced facts and limitations.
- `POST /api/study-plans/:analysisId/regenerate` — regenerate plan with user-selected timeframe.

## Interview
- `POST /api/interviews` — `{analysisId,type,targetDurationMinutes:20,mode:"text"|"voice"}`.
- `GET /api/interviews/:id` — session state, current question and progress.
- `POST /api/interviews/:id/answer` — `{questionId,answerText,transcriptEdited?}` → feedback + next-question state.
- `POST /api/interviews/:id/pause` — pause if supported.
- `POST /api/interviews/:id/resume` — resume.
- `POST /api/interviews/:id/end` — end session and calculate actual duration.
- `GET /api/interviews/:id/report` — final scorecard and practice tasks.
- `GET /api/interviews` — paginated history for current user.

## Ask Me
- `POST /api/coach/chat` — `{conversationId?,message,contextScope?}` → `{conversationId,answer,citations?,suggestedFollowUps?}`.
- `GET /api/coach/conversations` — list current user's conversations.
- `GET /api/coach/conversations/:id` — authorized history.
- `DELETE /api/coach/conversations/:id` — delete conversation.

## Study packs
- `POST /api/study-packs` — `{analysisId,includeTechnical:true,includeHR:true,includeProjects:true,questionCount:20}` → `{studyPackId,status}`.
- `GET /api/study-packs/:id` — status and metadata.
- `GET /api/study-packs/:id/download` — authorized PDF download.
- `DELETE /api/study-packs/:id` — delete generated file.

## System
- `GET /api/health` — basic health only; no secrets/config dumps.
- `GET /api/readiness` — authenticated/admin-safe dependency readiness status without exposing secret values.

## General rules
- Validate every body/query/path and file upload.
- Apply ownership checks before returning/updating records.
- Use pagination for history.
- Return `202 Accepted` for long-running analysis/PDF jobs if background jobs are used.
- Use idempotency or duplicate-submission protection for answer and PDF generation requests.
- Add rate limits to AI/search endpoints and reasonable request timeouts.
