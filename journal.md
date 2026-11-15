we'll update this journal every time we make a milestone or do something

## 2026-11-13 — Initial product build
- Set up a Next.js mobile-first prototype for Rush.
- Added PNM dashboard with schedule, invitations, RSVP and Apple Maps deep link.
- Added chapter rush workspace with live attendee gallery and invitation review affordance.

## 2026-11-14 — Repository guidance
- Added `AGENTS.md` with project context, development commands, and working conventions.
- Established that `AGENTS.md` stays current as the project evolves and `journal.md` records meaningful completed milestones.

## 2026-11-14 — Team ownership and backend roadmap
- Documented Henry's backend ownership, Miles's frontend ownership, and Dean's research/outreach ownership in `AGENTS.md`.
- Added a sequenced backend plan covering requirements, architecture, data/access rules, API contracts, vertical slice, auth, operational flows, and handoff.
- Recorded the current state: no backend is implemented, and provider, schema, auth, and API contracts remain undecided.

## 2026-11-14 — TypeScript decision
- Confirmed TypeScript as the project language for frontend and backend code, consistent with the existing `.ts` / `.tsx` app and strict `tsconfig.json` settings.
- Added guidance to share types where practical and validate untrusted runtime data at system boundaries.

## 2026-11-14 — Local browser instructions
- Added instructions for running the app and opening the PNM or member route in Chrome.

## 2026-11-14 — Draft database schema
- Added a discussion draft for relational tables and relationships covering profiles, chapter memberships, chapters, rush cycles, events, RSVPs/plans, attendance, invitations, shortlists, and audit events.
- Captured unresolved product and privacy decisions to validate with research before implementing migrations or policies.

## 2026-11-14 — Supabase platform decision
- Selected Supabase as the backend platform, using managed Postgres with Auth and Storage as needed.
- Established local Supabase development and versioned SQL migrations as the intended workflow; schema details and access policies remain to be designed.

## 2026-11-14 — Initial SQL schema
- Added the first Supabase Postgres migration for profiles, chapters, rush cycles, memberships, registrations/consent, events, plans, RSVPs, attendance, invitations, and shortlists.
- Added core constraints, indexes, status enums, and update timestamps. Row-level security policies and application integration remain pending requirements review.
- Updated the profile table so `full_name`, `phone`, and `photo_path` are required; hometown and major remain optional.
- Added chapter-specific PNM rush-round tracking so each PNM can be at a different round with each chapter in the same cycle.

## 2026-11-14 — Supabase app connection setup
- Added a typed-project-ready Supabase browser client factory using the public project URL and publishable key.
- Added `.env.example` and documented that secret/service-role keys must remain server-side.
- Enabled RLS on all app tables and added an active-chapter read policy; private records have no client access policies yet.
- Added idempotent seed SQL for the recognized chapter directory.
- Applied the chapter seed in the hosted Supabase project and connected the PNM chapter directory to read active chapters with a demo fallback on load errors.

## 2026-11-14 — PNM onboarding persistence
- Added Supabase phone OTP verification to onboarding, private profile photo upload, and profile upsert/reload.
- Added a follow-up migration with own-profile RLS policies and private Storage bucket policies. Hosted migration application and SMS provider configuration are still required before the flow can work end to end.
- Added optional hometown and major profile columns, a rush-cycle question prompt, and an optional PNM answer on the cycle registration. Chapter associations are represented through `chapter_memberships`.

## 2026-11-14 — Notification client foundation
- Added a PNM Profile opt-in for browser notifications and registered a same-origin service worker to receive Web Push payloads and open the linked portal view.
- Documented the backend contract for protected device subscriptions, VAPID/Edge Function delivery, and Supabase Realtime updates. Backend tables, policies, and sender credentials remain pending backend-owner implementation.

## 2026-11-14 — PNM directory contract
- Added a migration that registers authenticated PNM profiles in a restricted directory view for active members.
- The directory exposes only name, hometown, major, and profile photo path; it does not expose PNM phone numbers. Active-member access and PNM photo access are guarded by membership-based policies.

## 2026-11-14 — SQLite profile persistence
- Added a local SQLite profile store for UUID, role, name, contact and optional details, funny-question answer, photo path, house associations, and created/updated timestamps.
- Added profile read/create/update API routes and private local photo serving; the browser profile cookie survives sessions on the same device.
- Connected PNM and member/admin profile setup flows to SQLite. IFC Admin profiles associate with all recognized houses; Rush Chair and Active Member profiles select one; PNM profiles may select multiple.
- Added the configurable funny-question prompt in TypeScript and ignored the local database/photo data directory.

## 2026-11-15 — Member workspace and profile refinement
- Refined active-member navigation to focus on PNM profiles and the chapter schedule; rush-chair-only controls remain restricted to rush chairs.
- Made the PNM directory searchable by name, major, hometown, class year, and interests, with clear and empty-result states.
- Connected the member header logo to the PNM directory, labeled the profile control, and aligned the member profile with the PNM profile layout. Members can update major and hometown through the local profile API.
- Confirmed profile onboarding requires name, phone number, and photo; chapter association and other details remain optional.

## 2026-11-15 — SQLite chapter progress and event persistence
- Added versioned SQLite schema for rush cycles, exact rush stages, chapter-specific PNM progress and history, chapter events, and event sign-ups.
- PNM chapter associations and open-invite sign-ups now create open-invite progress without downgrading a later stage. Rush chairs can advance a PNM one stage at a time, with the actor and changes recorded in history.
- Connected the PNM chapter directory, schedule, member PNM directory, and event calendar to SQLite. Rush chairs can create chapter events and add PNM profiles from the member workspace; those records reload across sessions.
- Added a profile-switch action that clears the browser cookie while keeping each saved SQLite profile, making multi-profile pitch demos possible on one device.

## 2026-11-15 — Profile and member experience refinements
- Added logout and account-type switching that retains a saved profile and photo while allowing the user to choose a new role.
- Simplified PNM optional profile fields by removing the house-preference and personal-question controls from onboarding and editing.
- Added a required branded chapter-card picker for Active Member and Rush Chair profile completion.
- Kept the SQLite-backed member directory search and private PNM photo delivery, with search and progress data reconnected to the expanded SQLite backend.

## 2026-11-15 — Pitch demo database reset
- Cleared the existing profiles, chapter progress/history, events, and event sign-ups; retained the recognized chapter and rush-stage reference rows.
- Added 20 fictional PNM profiles, distributed across Delta Upsilon (7), Kappa Sigma (7), and Sigma Phi Epsilon (6), with varied profile fields and stages from `open invite` through `bid night`.
- Downloaded 20 Random User sample portraits into the local profile photo directory and linked each profile to its photo.
- Removed five orphaned portrait files belonging to the prior demo profiles.
- Removed automatic placeholder-event creation so the fresh database remains event-free until rush chairs add real demo events.

## 2026-11-15 — Delta Upsilon demo event schedule
- Added two future open-invite events for Delta Upsilon to the local SQLite database so PNMs can sign up from the chapter event list.
- Added an idempotent startup seed for those events when the active rush cycle has no Delta Upsilon open-invite events; the displayed address is labeled as a demo location.
- Updated the project setup notes to document this demo schedule behavior.

## 2026-11-15 — Shareable local demo fixture
- Added the 20 sample PNM records and portrait files to tracked `demo-data/` assets so a fresh clone can reproduce the pitch data.
- Added the TypeScript `npm run seed:demo` utility to copy portraits into local storage and add profiles, progress history, and event data without deleting existing profiles.
- Kept SQLite databases ignored and documented the seed workflow for collaborators.

## 2026-11-15 — Invitation review list
- Connected rush-chair invite selections to the invitation review screen, displaying selected PNM names, photos, and profile details before sending.
- Added per-PNM removal controls so a rush chair can refine the invite list without returning to the directory.

## 2026-11-15 — Persistent-host deployment preparation
- Added a Docker production build and Railway configuration for the Next.js app.
- Added a one-time, opt-in demo-data startup seed that preserves real data on the persistent `/app/data` volume.
- Documented the required persistent volume and deployment settings so SQLite databases and profile photos survive redeploys.
