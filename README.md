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

Profile records are saved in `data/rush.sqlite`, and uploaded photos are stored in `data/profile-photos`. The app creates these paths as needed. Set `SQLITE_DB_PATH` to use a different SQLite file. Keep the data directory on persistent writable storage; serverless filesystems may not preserve it between deployments.

See [`docs/profile-contract.md`](docs/profile-contract.md) for the profile API fields and role/house rules.

## Deploy

To deploy the UI, use a host that provides persistent writable storage for the SQLite database and profile photos, then replace the local URLs above with the deployed domain's `/pnm` and `/member` routes.

## Production check

```bash
npm run build
```

The app is a prototype. Profile persistence uses local SQLite; identity and authorization, production storage, event/RSVP persistence, check-in validation, and messaging delivery remain future integration work.
