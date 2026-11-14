# Repository Guide

## Project

- Rush is a mobile-first IFC recruitment hub prototype built with Next.js 14, React 18, and TypeScript.
- It currently has two product areas: the PNM portal at `/pnm` and the active-member workspace at `/member`. The root route redirects to `/pnm`.
- The current product is a UI prototype. Treat authentication, Supabase policies, QR validation, and SMS delivery as future integration work unless the task explicitly asks for them.

## Development

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- Create a production build with `npm run build`.
- The project uses strict TypeScript settings. Preserve type safety and avoid adding dependencies unless needed for the requested work.
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

The app currently has no backend or persistence layer; dashboard records and interactions are hard-coded in `app/pnm/page.tsx` and `app/member/page.tsx`. Work in this order, updating status here as decisions are made and tasks are completed:

1. **Confirm requirements and constraints.** Use Dean's research to define the rush lifecycle, entities, user types, privacy/consent needs, and who can see or change each record. Record open questions instead of baking guesses into the schema.
2. **Choose backend architecture.** Compare a managed Postgres/auth service (the README currently names Supabase as a possible future integration) with the deployment needs and team familiarity. Decide environment strategy, migration approach, and local development workflow before adding secrets or production data.
3. **Define domain model and access rules.** Draft the model for users, chapters, events, invitations, RSVPs, attendance/check-ins, and member shortlists. Define role and chapter boundaries, validation, retention, and audit needs with research input.
4. **Publish integration contracts.** Specify read/write operations and TypeScript shapes for PNM dashboard, event RSVP, member attendee list, invitation review, and check-in. Agree these with Miles before implementing UI-dependent endpoints.
5. **Implement the smallest vertical slice.** Start with safe configuration and schema/migrations, then a read path for events/invitations and an RSVP write path. Replace sample records only once the contract is agreed; keep a documented demo/seed path for local UI work.
6. **Add identity and authorization.** Implement authentication and server-side role/chapter authorization before exposing real PNM or member data. Do not treat client-side visibility as access control.
7. **Add operational flows.** Implement check-in token issuance/validation, invitation review, and any messaging integration only after workflow and abuse/privacy requirements are confirmed. Keep secrets server-side and make sensitive actions auditable.
8. **Harden and hand off.** Document environment variables, migrations, local setup, error behavior, and deployment steps. Verify only when requested, and update this guide and `journal.md` with completed decisions and milestones.

### Current Backend Status

- Backend implementation: not started; current routes use local sample data and component state.
- Backend provider, auth model, schema, and API contracts: undecided.
- Next action: coordinate with Dean to capture workflow, privacy, and access requirements, and with Miles to agree on the first data contract before choosing implementation details.

## Change Workflow

- Inspect nearby code and existing conventions before editing.
- Keep changes focused on the requested outcome and preserve unrelated user changes.
- Do not run tests or verification commands unless the user asks for verification. If asked, report the commands run and their results.
