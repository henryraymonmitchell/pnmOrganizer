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
