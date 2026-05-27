# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Case management web app for The Book Works education advocacy team (Louisville nonprofit). Tracks learners (participants) through a referral → intake → consent → assignment → active → exit pipeline, with AI-assisted goal generation and case note drafting. **Production target is AWS Amplify under a HIPAA BAA** — treat participant data as PHI.

### What landed recently (read this before assuming the state of any feature)

- **In-app consent signing** (vertical slice) — TBW Consent to Participate is now collected via a custom mobile-first signing flow with SMS + email delivery (Twilio + Resend). PDFs are generated with jsPDF, hashed (sha256), and stored in S3 with signer IP + user-agent. Four other forms still show "Paper for now" — adding them is JSON-only, no schema changes. Full details under [Consent administration](#consent-administration-in-app-signing).
- **Service exit narratives** — exit wizard now records the 11-phrase canonical outcome from the docs (`cases.exit_narrative`) plus the five short reason values. Reports dashboard surfaces a "Service Exit Narratives" breakdown.
- **`info_referral_closed` terminal case status** — for I&R-only closures (`referred_but_not_enrolled` exit reason); those cases skip the Stable phase.
- **Auth fixes across mutation routes** — every API route that writes a `created_by`/`author_id`/etc. now uses `getApiUser(req).dbId` instead of the string literal `'system'` (which was failing UUID parse). This was a single recurring bug across `intake/referral`, `case-notes`, `goals`, `cases/[caseId]/{assign,exit,enrollment,involvement-score}`, `stable/[stableId]/log`, `goals/[goalId]`. Server-side role enforcement is **not** yet added — see gap #9.

## Commands

```bash
npm run dev      # next dev (http://localhost:3000)
npm run build    # next build
npm run start    # next start (production)
npm run lint     # next lint (ESLint via eslint-config-next)
```

There is no test suite. There is no DB migration tool — `src/lib/db/seed.sql` is applied manually via the Neon SQL Editor (per README).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict, `@/*` → `src/*`)
- Neon Postgres via `@neondatabase/serverless` (HTTP, no pool)
- AWS Cognito (Hosted UI, authorization code flow) — JWT verified locally with `jose`
- Tailwind 3, lucide-react icons, recharts
- Anthropic SDK for AI features
- AWS S3 (document storage), Resend (email), Twilio (SMS), jsPDF (PDF generation)
- Dropbox Sign is still installed but is being replaced by in-app consent signing — see [Consent administration](#consent-administration-in-app-signing)

## Architecture

### Auth — three helpers, pick by context

Cognito issues an ID token that we store in the `tbw_id_token` cookie (`COOKIE_NAME` in `src/lib/auth/constants.ts`). Every request goes through `src/middleware.ts`, which redirects unauthenticated traffic to Cognito Hosted UI (allowlist: `/api/auth`, `/login`, `/_next`, `/favicon`).

Token verification + session loading happens in `src/lib/auth/cognito.ts`. Three entry points, do **not** mix them up:

- `getSession()` — server components / server actions. Reads cookie via `next/headers`.
- `getSessionWithDb()` — same as above, but also resolves the row in `users` table (joins Cognito `sub` to DB user). Use when you need `dbId`.
- `getApiUser(req)` (`src/lib/auth/api-auth.ts`) — API route handlers. Reads cookie from `NextRequest` because `next/headers` is awkward in route handlers; also returns `dbId`.

The Cognito custom claim `custom:db_user_id` short-circuits the DB lookup when present. `constants.ts` is split out so the Edge middleware can import URL helpers without pulling in `jose`/`next/headers` (which won't run on Edge).

### Routes & layout

- `src/app/(dashboard)/layout.tsx` is `force-dynamic` and calls `getSession()` — every page under it is authed and renders the `Sidebar`. Add new internal pages inside this route group.
- `src/app/(dashboard)/` contains feature pages: `intake/`, `cases/[caseId]/`, `goals/`, `sites/`, `reports/`, `dashboard/`, `coordinator/`, `stable/`. Per-case sub-pages live at `cases/[caseId]/{enrollment,exit,consent/[type]}`.
- `src/app/consent/sign/[type]/` is **outside** the (dashboard) group and **outside the auth wall** — it's the public tokenized signing route used by participants/guardians who don't have Cognito accounts. The middleware allowlists `/consent/sign` and `/api/consents/sign` for this.
- `src/app/api/` mirrors the feature surface. Per-case mutations live under `api/cases/[caseId]/{assign,documents,enrollment,exit,involvement-score,signature-request,consent}`. Consent infrastructure: `api/consents/{invite,sign,[signatureId]/pdf}`. AI endpoints under `api/ai/`. The Dropbox Sign callback at `api/webhooks/dropbox-sign` is legacy.
- `next.config.ts` redirects `/` → `/dashboard` and marks `@neondatabase/serverless` as an external server package.

### Data layer

All SQL lives in `src/lib/db/queries.ts` (~1k lines) using `@neondatabase/serverless`'s tagged-template `sql` from `src/lib/db/index.ts`. **Add new queries there rather than calling `sql` from routes/components** — most existing routes do, and keeping queries colocated makes schema changes manageable.

`src/types/index.ts` is the canonical type surface, including DTOs that mirror DB views (`v_intake_pipeline` → `PipelineCase`, `v_active_caseload` → `ActiveCase`). If you read from one of those views, return the matching interface; if you change the view, update the type.

The DB schema itself is not in the repo — it lives in Neon (originally seeded from a `schema.sql` referenced in the README, which is no longer present). Don't infer schema from types alone; check the actual queries or ask before adding columns.

### External services

- **S3** (`src/lib/storage/s3.ts`) — browser uploads go direct to S3 via presigned PUT URLs (`getPresignedUploadUrl`). Downloads use presigned GETs with `Content-Disposition: attachment`. Bucket env var is `APP_AWS_S3_BUCKET`; AWS creds are prefixed `APP_AWS_*` (not the reserved `AWS_*`, which Amplify/Vercel set themselves). Consent PDFs land under `cases/{caseId}/consents/{formType}/{version}/{iso}.pdf`.
- **Resend** (`src/lib/email/index.ts`) — transactional email. `sendEmail()` for the simple HTML cases (intake notifications). The consent-invitation flow uses the Resend client directly inside `src/lib/consents/invite-sender.ts` to send richer HTML+text+List-Unsubscribe messages. `RESEND_FROM_EMAIL` defaults to `noreply@peersupportstudio.com`.
- **Twilio** (`src/lib/sms/twilio.ts`) — SMS via a **Messaging Service SID** (not a From number) so 10DLC routing + sticky sender + opt-out are handled by Twilio. `normalizeUsPhoneE164()` returns `null` rather than guessing when a number can't be coerced — caller treats that as a validation failure. Webhook signature validation uses `validateTwilioSignature()` (HMAC-SHA1 with the auth token). Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, optional `TWILIO_STATUS_CALLBACK_URL`.
- **Dropbox Sign** (`src/lib/esign/dropbox-sign.ts`) — legacy. Only `tbw_consent` template is wired; webhook at `/api/webhooks/dropbox-sign` has a latent bug (writes to non-existent `case_consents` instead of `consents`, so signed-via-Dropbox-Sign consents never flipped status). Slated for removal once all five forms are migrated to in-app signing.
- **AI** (`src/app/api/ai/*`) — currently calls Anthropic model `claude-sonnet-4-20250514`. When updating models, check the system prompts: `generate-goals` produces structured JSON written straight to the `goals` table, and `draft-note` / `draft-exit-note` follow program-specific guidance (the source documents are in the gitignored `/docs` folder).

### Consent administration (in-app signing)

The TBW consent forms are administered through an in-app flow that replaces Dropbox Sign. Status: **vertical slice live for TBW Consent to Participate; four other forms still show "Paper for now"** until their JSON definitions are written.

The pieces:

1. **Form definitions** live as JSON config under `src/lib/consents/forms/*.json` and are registered in `src/lib/consents/forms.ts`. Each form is an array of typed screens (`intro | attestation | text | longtext | date | choice | multi | signature | review | organizations`). Pre-fillable fields reference case data via `prefillFrom: "participant.firstName"` etc. Add a new form by dropping a JSON file + adding it to the `FORMS` map.
2. **Schema** — two tables (see `seed.sql` migrations block):
   - `consent_invitations` — one row per `(case, form, channel)` send. Resends transactionally supersede prior `sent`/`opened` rows so history stays clean. Token is `randomBytes(32).toString('base64url')`, 30-day expiry.
   - `consent_signatures` — one row per completed signature attempt (signed OR declined). Stores `pdf_s3_key`, `pdf_sha256` (tamper-evidence), `signed_ip` (INET), `signed_user_agent`, the verbatim `signed_data` JSON, and `outcome_at_screen_key` for declines.
3. **Send flow** — `POST /api/consents/invite` (`src/lib/consents/invite-sender.ts`) — staff endpoint, role-gated to `admin | education_coordinator | intake_specialist`. Multi-channel dispatch (SMS + email + both), per-channel success/failure aggregation, redacted audit log entries (`***-***-1234`, `***@example.com`). Requires `NEXT_PUBLIC_APP_URL` (or `CONSENT_BASE_URL`) to build the participant signing link — set to `http://localhost:3000` for `npm run dev`.
4. **Sign flow** — `POST /api/consents/sign` — accepts **Cognito session XOR invitation token** (never both). Generates PDF via `src/lib/consents/pdf.ts`, **uploads to S3 first** then inserts the signature row (with S3 cleanup on DB failure). Rolls up signed/declined status to the matching `consents` row. Marks the invitation `completed`.
5. **UI** — `src/components/consent/consent-flow.tsx` is the mobile-first one-screen-at-a-time component used by **both** the public token route (`src/app/consent/sign/[type]/page.tsx`) and the staff in-person route (`src/app/(dashboard)/cases/[caseId]/consent/[type]/page.tsx`). Decline buttons on attestation screens jump straight to submission with `outcome: 'declined'` and `outcomeAtScreenKey` set.
6. **PDF** — jsPDF, helvetica, "Confidential — The Book Works" footer with participant name + DOB + page numbers on every page. Decline outcomes render up to and including the decline screen, then a bold "DECLINED at this point. Process terminated." line. The PDF bytes are sha256-hashed and the digest is stored on the row.
7. **Public sign page** — `/consent/sign/[type]?token=xxx` is allowlisted in `middleware.ts`. The page itself validates the token against `consent_invitations` (expiry, status, form-type match) before mounting `ConsentFlow`. Best-effort updates the row to `opened` on first view.

**Notarization** (JCPS ROI only) — the plan is: family signs digitally in-app → PDF generates with `requires_notarization=true` → staff prints, gets Elizabeth's wet stamp in person, scans the notarized version back to the case file as a `case_documents` row. The `consent_signatures.notarized_at`/`notarized_by`/`notarized_pdf_s3_key` columns exist for tracking this; the workflow isn't wired yet (no form definition for `jcps_roi` either).

### `/docs` is gitignored and contains sensitive material

`/docs` holds program PDFs (intake forms, case-note guidance, consent forms) **plus `tbw-app-s3_accessKeys.csv`**. It is in `.gitignore` — never `git add` anything under `docs/`, and don't read the access-keys CSV. The PDFs/docx files there are the source of truth for form fields, scoring rubrics, and AI prompt content; reference them when implementing form/AI work but don't paste their contents into code or commits.

## Conventions

- Path imports use `@/...` (alias to `src/`). Don't introduce relative `../../` paths.
- Server components are the default; client components are explicit (`'use client'`) and live under `src/components/<feature>/`.
- Database column names are `snake_case`; TypeScript fields are `camelCase`. Mapping happens ad-hoc in queries — match the existing pattern in `queries.ts` rather than introducing an ORM.
- The `Sidebar` is the only chrome — pages render directly into `<main>` from the dashboard layout.

## Domain Model

TBW's operational vocabulary — learner, advocate, involvement score, "stable" service, info-and-referral outcomes — comes from the program docs in `/docs`, not the code. The docs predate this app and are the source of truth when the two disagree. Authoritative doc per entity is listed below; check the doc before changing form fields, status enums, or AI prompts that mirror program language.

### Core entities

- **Participant** (`participants` table; `Participant` type) — Any person on a case. `role` is `learner | caregiver | partner | other`. In practice, almost all rows are learners; guardian data is currently denormalized into participant fields rather than stored as related participants with a relationship row.
- **Case** (`cases`; `Case`, `PipelineCase`, `ActiveCase`) — One per learner-engagement. Walks the `CaseStatus` pipeline: `referred → intake_scheduled → consent_pending → scored → assigned → active → stable → closed`. The transitions are encoded in `queries.ts` (`createCase` seeds `referred` + 5 pending consent rows; `upsertInvolvementScore` advances to `scored`; `assignCaseToAdvocate` advances to `assigned`).
- **Consent** (`consents`; `Consent`) — Five forms auto-seeded per new case: `tbw_participation`, `jcps_roi` (notarized by Elizabeth), `cascade_jcps`, `medical_waiver`, `emergency_contact`. The `ConsentFormType` enum also defines `policies_and_procedures`, `engagement_site_enrollment`, `caregiver_consent_learner_contact` for engagement-site flows. Status is flipped to `signed`/`declined` by the in-app consent flow (see [Consent administration](#consent-administration-in-app-signing)) — the `consents` row is the snapshot; full audit lives in `consent_signatures`. Multi-channel invitations live in `consent_invitations`.
- **Involvement Score** (`involvement_scores`; `InvolvementScore`) — 1–4 score on a 2×2 matrix of urgency × involvement. Set during intake before assignment; used by the coordinator queue to prioritize.
- **Goal** (`goals`; `Goal`) — Per-case, may be AI-generated. Status enum is `not_started | in_progress | completed | no_progress | discontinued`. `progress_pct` is tracked. AI generation pulls from enrollment form barriers.
- **Case Note** (`case_notes`; `CaseNote`) — Structured fields (`strengths`, `goals_discussed`, `barriers`, `next_steps`) plus a `full_note` body. `ai_drafted` flag, `goal_ids` array to tag which goals were discussed.
- **Enrollment Form** (`enrollment_forms` table, no dedicated type) — Deep intake captured after consent. Barriers are stored in a `barriers_data` JSON column (not first-class rows). Routes/components under `enrollment/` mirror the paper form's sections.
- **Service** (`services`, `stable_attendance_logs`) — `ServiceType` is `education_advocacy | engagement_site | youth_and_family | youth_development | info_and_referral | stable`. The "stable" service is a 30-day post-exit phase where the data specialist pulls JCPS attendance records and logs them in `stable_attendance_logs`.
- **Sites** (`sites`, `site_attendance`) — Engagement Hubs (Americana, Neighborhood House, etc.). Tracks daily attendance per learner.
- **Records Clerk** (`jcps_records_clerks`) — Lookup table for JCPS records-request emails; sourced from `docs/JCPS Records Clerks.xlsx`.
- **Notifications / Audit Log** — `notifications` for overdue notes & coordinator alerts (>7 days surfaces, >14 days "at risk"); `audit_log` for case status / assignment changes.

### Authoritative docs per concept

| Doc in `/docs/` | Authoritative for |
|---|---|
| `Current Intake Form.pdf` | Public Google referral form fields (referrer role, learner contact, school, goals, challenges). Submits to `/api/intake/referral`. |
| `The-Book-Works-Consent-English-8.2025.pdf` | TBW Consent to Participate + "About the Learner" demographic capture (pronouns, race/ethnicity, gender, language, trusted adults). Sent via Dropbox Sign. |
| `Enrollment Form 2025.docx` / `Education Advocacy Enrollment Form.pdf` | Post-consent intake. Defines the barrier checkbox vocabulary (Suspensions, Chronic Absences, Withdrawal/Gap, Online Learner, Safety/Bullying, Foster Care, Justice-Involved, ECE, Multilingual, Mental Health, Economic, Transportation, Houselessness), strengths list, challenges list, resources-requested list. Drives `src/components/enrollment/*` and AI goal generation context. |
| `Involvement Score Scale.docx` | The 1–4 score matrix and the canonical example list for each cell. Score 4 = High involvement + High urgency (housing crisis, suicidal ideation, ongoing SA, new court-involved truant, ECE assessment, etc.). Used by `involvement-score-modal.tsx`. |
| `Casebook Process.pdf` | Legacy ops manual. Defines the **service exit narrative enum** (Re-enrolled in school / Returned post-suspension / Returned with safety plan / Returned out-of-county / Returned with in-school supports / Returned with out-of-school supports / Returned with transportation / Enrolled in ongoing advocacy / Exited without re-enrolling / Referred but not enrolled). Also defines the multi-involvement model. |
| `Education Advocacy Processes (12_2025).docx` | The full lifecycle narrative — assignment SLAs (advocate makes contact within 2–3 business days), records-request email template, transfer-of-advocate scripts, exit triggers (reached goals / stopped responding after 6 attempts over 2 months / requested exit). |
| `TBW Case Note Guidance.pdf` + `Case Note Writing Guide.pdf` | Case note style (initials like "JA Learner" / "JA Mom", third-person "Advocate", date+time header, bulleted summary, explicit "Next Steps" section). AI `draft-note` prompts should mirror this. |
| `Education Advocacy Exit Interview.pdf` | Exit form fields. Drives `src/app/(dashboard)/cases/[caseId]/exit` and the `exit-wizard` step components (goals-review, interview, toolkit, case-note, finalize). |
| `Program Completion Toolkit.pdf` | Handout given to learner at exit (strengths checkbox, next steps, trusted-adults phone list, coping skills, crisis hotlines). Mirrored in `step-toolkit.tsx`. |
| `Education Progress Map.docx` | Per-six-week-period tracking grid (Classes, Absences UEA/EA/T, Grades, Suspensions, Barriers, Discoveries, Goals, Actions). Advocate tool — **not currently modeled** in the schema. |
| `Policies and Procedures.docx` | Engagement Hub building rules (backpacks, phones, smoking, fighting). Used as the `policies_and_procedures` consent form content. |
| `Platform Wishlist.pdf` | The team's explicit wishlist for this app. Useful when scoping new features — quote it when proposing changes. |
| `JCPS Records Clerks.xlsx` | Seed data for `jcps_records_clerks`. |
| `tbw-app-s3_accessKeys.csv` | **Secret. Never read.** |

### Known gaps between docs and code

1. ~~**Service exit narratives aren't enumerated.** Docs define 11 specific outcome phrases ("Returned to school with a safety plan", "Exited without re-enrolling", etc.) that the team uses for reporting. `ExitReason` only covers four broad reasons (`reached_goals | stopped_responding | requested_exit | other`); the granular narrative is a free-text field. Funder/grant reports likely need the granular version.~~ **RESOLVED** — Exit wizard now offers the 11-phrase canonical narrative as a dropdown with per-reason suggestions plus an "Other" free-text fallback; persisted to `cases.exit_narrative` and `services.outcome`. Reports dashboard surfaces a Service Exit Narratives breakdown. `ExitReason` also gained `change_in_goals` and `referred_but_not_enrolled`.
2. **Barriers are JSON, not rows.** `enrollment_forms.barriers_data` is a JSON blob; `getCaseForExit` reconstructs barrier names by splitting JSON keys on underscores. There's no resolution lifecycle ("did this barrier improve?") even though the exit interview explicitly asks per-barrier "Improved? Y/N + comments".
3. **Education Progress Map isn't modeled.** Advocates' six-week tracking grid (grades, absences, suspensions, actions per period) lives only on paper/docx. The only attendance data we capture is the 30-day post-exit pull in `stable_attendance_logs`.
4. **Caregivers/guardians aren't first-class participants.** `ParticipantRole` enum supports `caregiver | partner | other`, but in practice guardian info is stored as denormalized fields on the learner's participant row, and there's no relationship/link table. Wishlist explicitly asks for this.
5. **Multi-service / multi-involvement per case is partial.** Docs describe a learner concurrently in Education Advocacy + Engagement Sites with separate goals and end-dates per service. We have a `services` table and `ServiceType` enum, but most queries treat the case as the unit of lifecycle.
6. ~~**"Info & Referral" terminal status missing.** Docs treat this as a distinct involvement that may close out as "Referred but not enrolled" without ever becoming advocacy. `CaseStatus` has no such terminal state — it would end up `closed` with no narrative.~~ **RESOLVED** — `CaseStatus` now includes `info_referral_closed`. When the exit wizard's reason is `referred_but_not_enrolled`, the case skips the Stable phase + data-specialist reassign and jumps straight to that terminal status.
7. **Records-request tracking is read-only.** `getRecordsClerkBySchool` looks up clerks, and there's a `records-request-panel.tsx` component, but I don't see a table tracking *which* requests were sent or when records came back. Likely piggybacks on `case_documents`.
8. **Goal categories** in the AI prompt (`Attendance, Academics, IEP/504, Enrollment, Credit Recovery, Transfer, Graduation, Post-secondary, Self-advocacy, Other`) are hard-coded in the generate-goals route and don't live in a config or DB enum.
9. **No server-side role enforcement on mutation routes.** Every mutation route now requires a valid Cognito session (via `getApiUser(req)`), but none of them check that the session user's `role` matches what the action requires. The docs describe a strict role split — only Education Coordinators assign advocates, only Intake Specialists score involvement, only Advocates exit cases, only the Data Specialist closes Stable services — yet a logged-in user of any role could call any of these endpoints and have the action succeed (with their UUID as the actor). The UI gates each action by role today, but the API is the source of truth and should re-check. Affected routes: `cases/[caseId]/assign`, `cases/[caseId]/involvement-score`, `cases/[caseId]/exit`, `cases/[caseId]/enrollment`, `stable/[stableId]/log`, `goals/[goalId]`, `case-notes`. (Exception: `api/consents/invite` and `api/consents/signature-request` already enforce the staff role allowlist.)
10. **Only one of the five consent forms is wired for in-app signing.** TBW Consent to Participate has a JSON definition in `src/lib/consents/forms/`. The other four (`jcps_roi`, `cascade_jcps`, `medical_waiver`, `emergency_contact`) still show "Paper for now" badges in the consents panel. Each needs a JSON file transcribed from the corresponding source PDF in `/docs`. The architecture is form-driven, so no further code changes are required once the JSON is in place — and the JCPS ROI is the tricky one because of the notarization step (see [Consent administration](#consent-administration-in-app-signing)).
11. **Dead Dropbox Sign code.** `src/lib/esign/dropbox-sign.ts`, `src/app/api/webhooks/dropbox-sign/route.ts`, `src/app/api/cases/[caseId]/signature-request/route.ts`, and the `@dropbox/sign` package are still in the repo. The webhook also has a latent bug (writes to non-existent `case_consents` instead of `consents`). Slated for removal once gap #10 closes and Jess confirms no one is still relying on the old path. Until then, the consents panel only routes forms with a JSON definition to the new flow, so these endpoints aren't called for `tbw_participation`.

## Project Conventions

These are hard rules; deviating from them will silently break the build or the runtime.

### Next.js 15 dynamic route params

`params` (and `searchParams`) in dynamic route handlers and `page.tsx` files are **always typed as a `Promise`** in Next 15 and must be `await`ed. This is true for both server components and API route handlers.

```ts
// app/cases/[caseId]/page.tsx
export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  // ...
}

// app/api/cases/[caseId]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  // ...
}
```

Typing `params` as a plain object (e.g. `{ caseId: string }`) compiles but blows up at runtime with the Next 15 type generator.

### Neon serverless driver — no transactions

`@neondatabase/serverless` uses the Neon HTTP endpoint. It exposes the tagged-template `sql` for single statements but **does not implement `sql.begin()` / `sql.transaction()`** the way `postgres.js` or `pg` does. For multi-step writes that must look atomic, use sequential awaits and accept that they aren't a real transaction:

```ts
// Right:
const newCase = (await sql`INSERT INTO cases (...) VALUES (...) RETURNING *`)[0]
await sql`INSERT INTO consents (...) VALUES (...)`

// Wrong — there is no sql.begin on the HTTP driver:
await sql.begin(async (tx) => { ... })
```

If you genuinely need transactional semantics (e.g. payment-like flows), use a CTE that performs both writes in a single statement, or move to the pooled `@neondatabase/serverless` `Pool` over WebSocket. Default for this app is sequential awaits.

### Query functions need explicit return types

The Neon driver's tagged `sql` returns a generic `Record<string, any>[]` (or similar) — TypeScript can't see what columns a SELECT actually returns. When a query function does `return { ...rows[0], extraField }`, the spread loses all the joined columns from the type checker's view and downstream code passes `undefined` silently.

Annotate the return type explicitly on raw-SQL query functions whose result gets spread or destructured:

```ts
// Right:
export async function getCaseForExit(caseId: string): Promise<{
  id: string; case_number: string; status: string
  first_name: string; last_name: string
  goals: Record<string, any>[]; barriers: string[]
} | null> {
  const rows = await sql`SELECT ...`
  // ...
  return { ...rows[0], goals, barriers } as any
}

// Wrong — caller sees `any` for everything except `goals`/`barriers`:
export async function getCaseForExit(caseId: string) {
  const rows = await sql`SELECT ...`
  return { ...rows[0], goals, barriers }
}
```

See `getCaseForExit` and `getCaseForEnrollment` in `queries.ts` for the established pattern.

### Workflow: build-error-driven edits

The preferred working loop is:

1. User pastes the exact build / type error.
2. Diagnose the specific cause from the error and the relevant file(s) — don't speculate beyond what the error says.
3. Apply a **minimal, targeted** fix to the offending line(s).
4. Return a **drop-in file replacement** for any file changed, not a diff or a snippet to splice in.

Things to avoid in this loop:

- Refactoring nearby code "while you're in there".
- Introducing helper functions, abstractions, or generic wrappers to "make this cleaner".
- Adding defensive validation, try/catch, or feature flags around the fix.
- Touching files that the error doesn't implicate, even if you spot something in them.
- Writing planning docs, decision logs, or "summary of changes" files.

The user is iterating quickly through real build errors — small, surgical, drop-in edits are how they want to work.

## Program Reference

Frozen from the `/docs` source files so they're available without re-reading PDFs. If the docs change, update this section.

### Involvement Score Matrix (from `Involvement Score Scale.docx`)

The 1–4 score is a 2×2 of involvement × urgency. Use these examples to score consistently and to seed UI copy / AI context.

**Score 4 — High involvement, High urgency:**
- Housing instability (hotel / car / on the street / evicted)
- Ongoing self-harm, suicidal ideation, or mental-health crisis
- Ongoing severe bullying
- Ongoing sexual assault (SA)
- Ongoing community / gun violence
- Ongoing grief or loss of a loved one
- Assessment for ECE (Exceptional Child Education)
- Accessing parenting / pregnancy resources
- Justice involvement
- New to foster care
- Multilingual learner needing language support
- New court-involved truant

**Score 3 — High involvement, Low urgency:**
- Immediate transfer
- Unenrolled
- ECE — implementation of IEP / 504 / BIP
- Credit-recovery enrollment
- Ongoing foster-care involvement
- Immediate transportation needs
- Economic needs — referring to resources
- Court-involved truant monitoring

**Score 2 — Low involvement, High urgency:**
- Housing instability — safe housing but unstable
- Bullying
- SA
- Community / gun violence
- Multilingual learner

**Score 1 — Low involvement, Low urgency:**
- Transitioning back to comprehensive school
- Transferring schools
- Credit-recovery help
- Navigating education options
- Withdrawn / gap in enrollment
- Reducing suspensions
- Online learning
- Setting post-graduation goals
- Self-advocacy

### Service exit narratives (from `Casebook Process.pdf`, `Education Advocacy Processes.docx`)

The 11 canonical outcome phrases used when ending a service. Use these verbatim — funder/grant reports parse them as a closed set. They apply both to Education Advocacy and Engagement Site services.

1. Re-enrolled in school.
2. Learning online with additional supports.
3. Returned to school post-suspension.
4. Returned to school with a safety plan.
5. Returned to out-of-county school.
6. Returned to school with a plan for additional in-school supports.
7. Returned to school after receiving additional out-of-school supports.
8. Returned to school with a plan for transportation.
9. Enrolled in ongoing education advocacy services to reach goals. *(or, for advocacy exit: "Exited after enrolling in ongoing education advocacy services to reach goals.")*
10. Exited *without* re-enrolling in school or unknown departure.
11. Referred but not enrolled. *(use when the learner was referred but the advocate couldn't make contact or formally enroll them)*

The shorter `reason for ending service` dropdown has five values: **Completed goals / Stopped responding / Requested exit / Change in goals / Referred but not enrolled**.

### Exit triggers (from `Education Advocacy Processes.docx`)

An advocate should initiate exit when one of:

- **Reached goals** — Learner met the goals set at intake (e.g. enrolled in credit recovery and progressing).
- **Stopped responding** — No contact after **at least six attempts (phone + text) over two months**. Example sequence: last response 6/1; texts on 6/7, 6/21, 7/1, 7/14; unanswered calls + voicemails 6/22 and 7/15; final attempt 8/1.
- **Requested exit** — Learner or caregiver asks to end services. If goals were also met, classify as "Reached goals" instead.

After exit, advocate opens a **Stable** service assigned to the Data Specialist with a planned end date 30 days out; the case stays **active** until records are pulled.

### Case-note style (from `TBW Case Note Guidance.pdf`, `Case Note Writing Guide.pdf`)

Mandatory in any AI-drafted or manually-written note. The `draft-note` system prompt should enforce all of these.

- **Use initials for the learner and caregiver, not names.** Learner = `JA Learner` (or `JA`); caregiver = `JA Mom`, `JA Dad`, `JA Gma`, `JA Guardian`. Use the learner's own initials (here illustrated as JA).
- **Use the job title, not the staff member's name.** Write `Advocate` (or `Site Lead`, `Counselor`), not `Emily`.
- **Third person, never first person.** "Advocate suggested…" not "I suggested…".
- **Header line is date + time range.** `10/14/25 4:15p - 5:07p` or `10/13/25 2:21 PM - 2:34 PM`.
- **Define abbreviations on first use, then reuse.** `Beechmont Community Center (BCC)` → later just `BCC`. Same for `JCTC`, `MDA`, `AP` (Assistant Principal), etc.
- **Body is bulleted, not prose.** Sections typically: `In attendance:` → `Meeting Summary:` (or bulleted points) → `Next Steps:`.
- **Observable facts only.** No assumptions or personal opinions; the learner and caregiver should be able to read the note and agree it reflects what happened.
- **Always include a `Next Steps:` section** when actions were agreed to.
- **Subject line** is a short summary like `Check-In: Progress Update`, `Attempted Check-In`, `ARC Meeting: 504 Plan Development`, `Mtg at School re: Concerns`.

### Structured barrier vocabulary (from `Enrollment Form 2025.docx`)

The 13 barriers the enrollment form captures (currently stored as JSON keys in `enrollment_forms.barriers_data`). Each one has an associated narrative field on the form, and the exit interview asks "Improved? Y/N + comments" per barrier.

1. Suspensions (how often, how many)
2. Chronic Absences (how long since consistently attending, why)
3. Withdrawal or Gap in Enrollment (how long)
4. Online Learner (how long, why)
5. School Safety Issues or Bullying (how long, whether addressed)
6. Foster Care (length of involvement)
7. Justice-Involved (status of court involvement)
8. ECE (has IEP/504, services provided, needs (re-)evaluation)
9. Multilingual (needs language support)
10. Mental Health Needs (needs referral)
11. Economic Needs (job, food stamps, etc.)
12. Transportation Issues (how long, what support)
13. Houselessness (needs housing assistance)

The form also asks for a **single "primary barrier"** designation among these.

### Resource-request vocabulary (from `Enrollment Form 2025.docx`)

The 16 resource categories the learner can be flagged for referral to:

Youth Leadership/Civic Engagement · College Preparation · Post-Secondary/Vocational Training · Employment · Food Resources · Housing Resources · Immigration Services · Job Training · Juvenile/Criminal Justice Resources · LGBTQ Resources · Medical Assistance · Mental Health Resources · Pregnant/Parenting Youth · Substance (drug/alcohol) Abuse · Victim Assistance — Urgent Safety Concerns · Victim Assistance — Other.

### Goal categories (hard-coded in `src/app/api/ai/generate-goals/route.ts`)

The AI generate-goals prompt restricts category to one of:

`Attendance · Academics · IEP/504 · Enrollment · Credit Recovery · Transfer · Graduation · Post-secondary · Self-advocacy · Other`

If you change this list, update both the system prompt and any UI filters in `goals-panel.tsx` / `goals/page.tsx`.

### Staff roles (from `Education Advocacy Processes.docx` ↔ `UserRole` enum)

| Doc role | `UserRole` value | Responsibilities |
|---|---|---|
| Intake Specialist | `intake_specialist` | Receives referrals, performs intake conversation, assigns involvement score, emails Education Coordinator. |
| Education Coordinator | `education_coordinator` | Reviews scored intakes, assigns to an advocate, manages caseloads, conferences with advocates on cases. |
| Education Advocate | `advocate` | Owns active case; makes contact within 2–3 business days of assignment; writes case notes within 2–3 business days of each interaction. |
| Data Specialist | `data_analyst` | Owns the Stable service (30-day post-exit records pull). |
| Site Lead | `site_lead` | Runs an Engagement Hub. |
| Executive Director | `executive` | Pulls annual reports. |
| Admin | `admin` | App admin (not a program role). |

### Engagement Hub locations (from `Policies and Procedures.docx`, `Exit Interview.pdf`)

Currently operating sites referenced in the docs:

- **Americana** (Education Engagement Hub @ Americana)
- **Neighborhood House** (Education Engagement Hub @ Neighborhood House)
- **502 Blue Print** (referenced in building policies; engagement hub site)

Building rules per `Policies and Procedures.docx`: backpacks/large bags checked at front desk; phones permitted but staff may require them put away; no smoking/vaping (KY law for under-21); students must remain with staff; no violence or harmful language. Violations → site lead may contact parent for early pickup; continued participation reviewed jointly with family.

### Crisis resources (from `Program Completion Toolkit.pdf`)

Numbers given to learners at program exit — useful as defaults in any safety-plan UI:

- **Mental Health Hotline:** call or text **988**
- **The Trevor Project (LGBTQ+):** call **1-866-488-7386**, or text `START` to **678-678**
- **Seven Counties:** **(502) 589-1100**
- **TBW Education Advocate line:** **502-276-6136**

### Education Progress Map structure (from `Education Progress Map.docx`)

Advocate's six-week tracking grid. Not currently modeled in the schema, but if/when it's added, this is the row structure per learner per school year (6 columns, one per JCPS six-week grading period):

| Row | Content |
|---|---|
| School & Grade | e.g. `Iroquois, 9th` |
| Classes | comma-separated list |
| Absences | `12 UEA, 3 EA, 2 T` (Unexcused / Excused / Tardy) |
| Grades | one letter per class, in same order as Classes row |
| Suspensions | count + days (`2 (5 days, 3 days)`) |
| Barriers | from the 13-item barrier vocabulary |
| Discoveries / Improvements | narrative |
| Goals | narrative |
| Actions Taken | narrative |

JCPS 25–26 six-week periods: 8/7–9/17, 9/18–11/5, 11/6–12/19, 1/5–2/13, 2/18–4/2, 4/13–5/22.
