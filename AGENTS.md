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

## Change Workflow

- Inspect nearby code and existing conventions before editing.
- Keep changes focused on the requested outcome and preserve unrelated user changes.
- Do not run tests or verification commands unless the user asks for verification. If asked, report the commands run and their results.
