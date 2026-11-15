# Rush

Mobile-first recruitment hub for IFC rush. This starter experience includes:

- A PNM dashboard with upcoming event, RSVP state, schedule, and maps deep link
- A chapter workspace with live attendee gallery and invitation-review affordance
- Separate PNM and active-member product routes

## Run locally

```bash
npm install
npm run dev
```

The root route opens the profile setup gateway. You can also open these routes directly in the same browser/device running `npm run dev`:

- PNM portal: `http://localhost:3000/pnm`
- Active-member workspace: `http://localhost:3000/member`

These are local development URLs, so they do not work when clicked from GitHub unless the app is running on your computer.

Recognized chapter names, profiles, chapter progress, events, and event sign-ups are saved in `data/rush.sqlite`; uploaded photos are stored in `data/profile-photos`. The app creates these paths as needed and applies versioned SQLite migrations at startup. Set `SQLITE_DB_PATH` to use a different database file, or `RUSH_CYCLE_NAME` to name the active rush cycle. The first database startup seeds one demo open-invite event for each recognized chapter. Keep the data directory on persistent writable storage; serverless filesystems may not preserve it between deployments.

Rush chairs can add PNM profiles from the member workspace. Selecting a chapter in the PNM portal associates that chapter with the PNM and creates `open invite` progress for the active cycle. Event sign-ups, chair progress changes, and chapter events persist across browser sessions. Use **Switch profile** in the profile tab to sign out of the current demo profile while keeping its database record.

See [`docs/profile-contract.md`](docs/profile-contract.md) for the profile, event, and progress API contracts.

## Deploy

To deploy the UI, use a host that provides persistent writable storage for the SQLite database and profile photos, then replace the local URLs above with the deployed domain's `/pnm` and `/member` routes.

## Production check

```bash
npm run build
```

The app is a prototype. SQLite persistence is local to the host. The profile cookie is a demo identity token, and production authentication/authorization, photo storage, check-in validation, and messaging delivery remain future integration work.
