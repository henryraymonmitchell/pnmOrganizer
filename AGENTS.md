# Repository Guide

## Project

- Rush is a mobile-first IFC recruitment hub prototype built with Next.js 14, React 18, and TypeScript.
- It currently has two product areas: the PNM portal at `/pnm` and the active-member workspace at `/member`. The root route redirects to `/pnm`.
- The current product uses local SQLite for profiles, event data, verification sessions, and chapter chat. New profile creation requires provider-backed Cal Poly email and SMS confirmation when the server secrets are configured; production storage, QR validation, and broader authorization hardening still need operational review.

## Development

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- To open the running app in Chrome, start `npm run dev`, then navigate in Chrome to `http://localhost:3000/pnm` (or `http://localhost:3000/member`). The root URL `http://localhost:3000` redirects to `/pnm`.
- Create a production build with `npm run build`.
- The project uses strict TypeScript settings. Preserve type safety and avoid adding dependencies unless needed for the requested work.
- Use TypeScript for all new application and backend code (`.ts` / `.tsx`); do not introduce JavaScript files for app logic. Share domain and API contract types where practical, while validating untrusted data at runtime because TypeScript types do not validate network input.
- Follow the existing app structure and visual patterns when implementing features. Keep the experience mobile-first and make interactive controls usable with keyboard and touch.

## Project Memory

- Update `journal.md` for every meaningful milestone or completed unit of work, following its dated-entry format.
- Keep this `AGENTS.md` accurate as the project structure, scripts, architecture, or working conventions change. Update it in the same change when a task introduces a lasting convention or materially changes the project setup.
- Do not add routine edits or speculative future plans to the journal; record concrete work that was completed.

## Team Ownership

- Henry owns backend architecture, data modeling, persistence, authorization, and API/service integration.
- Miles owns frontend routes, components, interaction design, and client-side integration with backend contracts.
- Dean owns research and outreach, including validating recruitment workflows, stakeholder requirements, policy constraints, and operational assumptions.
- Coordinate through written contracts: backend changes should document endpoint/data shapes and expected errors; frontend changes should flag required backend capabilities; research findings that affect data or policy should be recorded in the journal and reflected here when they become durable decisions.
- Avoid editing another person's owned area unless the work is coordinated or necessary to unblock an integration.

## Henry's Backend Work Plan

The prototype persists profiles, chapter progress, events, event sign-ups, verification records, and private chapter messages in a local SQLite database. Invitation delivery, notification delivery, and attendance workflows still remain mock/client state. Continue in this order, updating status here as decisions are made and tasks are completed:

1. **Confirm requirements and constraints.** Use Dean's research to define the rush lifecycle, entities, user types, privacy/consent needs, and who can see or change each record. Record open questions instead of baking guesses into the schema.
2. **Maintain the SQLite store.** Keep persistence server-side, keep the database file out of Git, and record schema changes in versioned migrations under `lib/server/sqlite-migrations.ts`.
3. **Define domain model and access rules.** Draft the model for users, chapters, events, invitations, RSVPs, attendance/check-ins, and member shortlists. Define role and chapter boundaries, validation, retention, and audit needs with research input.
4. **Publish integration contracts.** Specify read/write operations and TypeScript shapes for PNM dashboard, event RSVP, member attendee list, invitation review, and check-in. Agree these with Miles before implementing UI-dependent endpoints.
5. **Implement the next vertical slice.** Continue adding datasets only after their contracts and access rules are agreed. Keep a documented demo path for local UI work.
6. **Add identity and authorization.** Implement authentication and server-side role/chapter authorization before exposing real PNM or member data. Do not treat client-side visibility as access control.
7. **Add operational flows.** Implement check-in token issuance/validation, invitation review, and any messaging integration only after workflow and abuse/privacy requirements are confirmed. Keep secrets server-side and make sensitive actions auditable.
8. **Harden and hand off.** Document environment variables, migrations, local setup, error behavior, and deployment steps. Verify only when requested, and update this guide and `journal.md` with completed decisions and milestones.

### Current Backend Status

- Profile records are stored in `data/rush.sqlite`; photos are stored under `data/profile-photos`. Both are ignored by Git. Set `SQLITE_DB_PATH` to choose another database file.
- The SQLite profile schema stores UUID, role, full name, hometown, major, optional funny-question answer, phone, photo path, and ISO timestamps. House associations are normalized into `profile_houses`; IFC Admin profiles receive every recognized house, Rush Chair and Active Member profiles require exactly one, and PNM profiles may select any number.
- SQLite migration version 1 adds `chapters`, `rush_cycles`, `rush_stages`, `pnm_chapter_progress`, `pnm_progress_history`, `events`, and `event_signups`. Migration 2 adds verified email/phone profile fields plus passwordless email challenges and hashed browser sessions; migration 3 adds persisted chapter message threads. The five exact stage values are `open invite`, `closed invite day 1`, `closed invite day 2`, `closed invite day 3`, and `bid night`.
- PNM progress is keyed by rush cycle, chapter, and PNM. Saving a PNM chapter association or signing up for an open-invite event creates `open invite` progress without downgrading a later stage. Rush chair progress updates can stay at the current stage or advance one stage and are written to history with the actor.
- Rush chairs can add PNM profiles to SQLite from the member workspace. The PNM directory and both event schedules load from SQLite; chapter events and event sign-ups persist across sessions. The active cycle defaults to `Fall 2026` and can be named with `RUSH_CYCLE_NAME`.
- The active rush cycle receives two future Delta Upsilon open-invite demo events if it has none; their address is explicitly labeled as a demo location. Rush chairs create events for other chapters from the member calendar. The current local database has 20 fictional PNM demo records across Delta Upsilon, Kappa Sigma, and Sigma Phi Epsilon. Runtime databases and photo copies are gitignored in `data/`; tracked source fixtures are in `demo-data/`.
- Recreate the tracked demo profiles, stage history, portraits, and open-invite schedule after cloning with `npm run seed:demo`; this preserves existing non-demo data and progress. The source fixture is in `demo-data/` and the TypeScript seed utility is in `scripts/`.
- `GET`, `POST`, and `PATCH /api/profile` read and write the current browser profile. New writes require an HttpOnly hashed session created by `POST /api/auth/email/verify` plus a Twilio-verified phone; the legacy `rush_profile_id` cookie remains only as a migration-compatible fallback for existing local demo records.
- The rush-chair funny-question prompt is configured in `lib/profile-domain.ts`. The profile stores the user's optional answer.
- Verification uses Resend for `@calpoly.edu` email codes and Twilio Verify for SMS codes; configuration is server-only through `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_CODE_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`. Never put provider secrets in `NEXT_PUBLIC_*` variables or browser code.
- `GET` and `POST /api/messages` persist PNM/rush-chair chapter threads in SQLite and enforce the requesting profile's role and associated chapter. The user interface polls the API for new messages.
- SQLite files and photos require persistent writable disk. Do not rely on ephemeral serverless storage for durable profile data, and do not expose this prototype's profile API as production data without identity and authorization.
- Next action: configure the verification providers and deployment secrets, then review privacy/retention, message moderation, invite delivery, and attendance requirements before broader production use.

### Draft Relational Schema (For Discussion)

This is a discussion draft for a future auth-backed system, not the current SQLite profile schema or an approved migration. Use UUID primary keys, `created_at` / `updated_at` timestamps, foreign keys, and explicit status fields. Normalize chapter/event data instead of duplicating it in each PNM's records.

- `profiles`: one row per authenticated user; auth provider user ID, full name, phone, photo storage key, hometown, and major. Name and phone are required; hometown and major are optional. Store phones as text in normalized international format (for example `+13428765643`). A hosted version should store a storage object key; the current local SQLite prototype stores a relative photo path. Keep credentials in the auth provider, not this table.
- `chapter_memberships`: user-to-chapter relationship with role (`pnm`, `member`, `chapter_admin`, `ifc_admin`) and status. For PNMs, rows represent the houses they associate with; IFC Admin access across all chapters is handled by role/policy rather than duplicating a row per house. Chapter-scoped access must be enforced by server/database policy.
- `chapters`: IFC-recognized organizations; official name, short name, branding colors, active status. Confirm authoritative source and whether chapters have a campus/organization parent.
- `rush_cycles`: a defined recruitment period (term/year, start/end dates, status). Scope events and policies to a cycle so future rush periods do not overwrite historical data.
- `events`: belongs to a chapter and rush cycle; title, description, start/end timestamps with timezone, location/address, capacity if applicable, status, creator, and visibility. Avoid storing formatted date strings.
- `event_rsvps`: unique `(event_id, pnm_id)` record with RSVP status and response timestamp. If PNMs add events to a personal plan without committing, use a separate `planned_events` table or an explicit `planned` RSVP status, depending on the agreed product semantics.
- `attendance`: event and PNM reference, check-in timestamp, method, and check-in actor/device reference. Enforce one attendance record per PNM/event unless repeat entry is a real requirement. Do not accept attendance solely from a client-submitted boolean.
- `invitations`: chapter, PNM, rush cycle, status, created/decided timestamps, and actor. Add uniqueness and lifecycle rules only after Dean clarifies whether repeat invitations or rescinds are allowed.
- `shortlists`: member-to-PNM relationship scoped to a chapter, with created-by and optional private notes only if policy allows. Determine visibility and retention before storing evaluations or sensitive notes.
- `audit_events` (as needed): actor, action, target, timestamp, and minimal metadata for sensitive operations such as invitation decisions or attendance correction. Define retention and access before collecting broad logs.

#### Relationships and Constraints to Validate

- A PNM may interact with multiple chapters during one rush cycle; a chapter owns its events and invitations.
- A user can have different roles in different chapter/cycle contexts; avoid a single global `role` field as the only authorization source.
- The current SQLite `pnm_chapter_progress` table stores the exact display stage values (`open invite`, `closed invite day 1`, `closed invite day 2`, `closed invite day 3`, `bid night`) with `(rush_cycle_id, chapter_name, pnm_id)` uniqueness. The draft hosted model may use normalized stage keys after the auth-backed schema is agreed.
- `rush_registrations` stores cycle-specific PNM registration and phone consent in the future hosted model. Round changes must be restricted to authorized chapter/rush chairs and recorded with the updating actor.
- `profiles` includes optional `hometown` and `major`. `rush_cycle_settings.funny_question_prompt` stores the cycle's rush-chair-configured optional question; `rush_registrations.funny_question_answer` stores each PNM's optional response.
- Decide whether PNM profile identity is global across cycles or whether additional cycle-specific profile data belongs in `rush_registrations`.
- The current PNM portal treats "sign up" as a durable event signup and displays it in My schedule. Attendance remains a separate future check-in record.
- Specify policies for phone/photo access, invitation privacy, shortlist visibility, data deletion/retention, consent, and attendance correction before enabling real data.

## Change Workflow

- Inspect nearby code and existing conventions before editing.
- Keep changes focused on the requested outcome and preserve unrelated user changes.
- Do not run tests or verification commands unless the user asks for verification. If asked, report the commands run and their results.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
