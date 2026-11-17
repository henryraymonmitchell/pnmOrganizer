# Rush

Mobile-first recruitment hub for IFC rush. This starter experience includes:

- A PNM dashboard with upcoming event, RSVP state, schedule, and maps deep link
- A chapter workspace with live attendee gallery and invitation-review affordance
- Separate PNM and active-member product routes

## Run locally

```bash
npm install
npm run seed:demo (optional)
npm run dev
```

The root route opens the profile setup gateway. You can also open these routes directly in the same browser/device running `npm run dev`:

- PNM portal: `http://localhost:3000/pnm`
- Active-member workspace: `http://localhost:3000/member`

These are local development URLs, so they do not work when clicked from GitHub unless the app is running on your computer.

Recognized chapter names, profiles, chapter progress, events, and event sign-ups are saved in `data/rush.sqlite`; uploaded photos are stored in `data/profile-photos`. The app creates these paths as needed and applies versioned SQLite migrations at startup. Set `SQLITE_DB_PATH` to use a different database file, or `RUSH_CYCLE_NAME` to name the active rush cycle. If a rush cycle has no Delta Upsilon open-invite events, startup adds two future demo events with a clearly labeled demo location; rush chairs can create events for other chapters from the member calendar. The current local database contains 20 sample PNMs across Delta Upsilon, Kappa Sigma, and Sigma Phi Epsilon. Their fictional portraits come from the [Random User Generator](https://www.randomuser.me/documentation), which provides sample data for application testing. The live database and runtime photo copies in `data/` are gitignored; the tracked source fixture is in `demo-data/`. Keep runtime data on persistent writable storage; serverless filesystems may not preserve it between deployments.

To recreate the sample profiles and portraits after cloning, run `npm run seed:demo`. The demo fixture and portrait files are tracked in [`demo-data/`](demo-data/README.md); the SQLite database remains local and ignored by Git.

Rush chairs can add PNM profiles from the member workspace. Selecting a chapter in the PNM portal associates that chapter with the PNM and creates `open invite` progress for the active cycle. Event sign-ups, chair progress changes, and chapter events persist across browser sessions. Use **Switch profile** in the profile tab to sign out of the current demo profile while keeping its database record.

See [`docs/profile-contract.md`](docs/profile-contract.md) for the profile, event, and progress API contracts.

## Cal Poly email, phone verification, and messages

New accounts use a passwordless confirmation flow: a six-digit email code is sent only to a valid `@calpoly.edu` mailbox, then the user confirms their phone by SMS before a profile can be saved. This verifies control of a Cal Poly email address; it is not Cal Poly single sign-on. Official SSO would require an approved Cal Poly identity-provider integration.

The app intentionally has no development bypass for either confirmation. Configure these server-only variables locally or in Railway before inviting real users:

```bash
RESEND_API_KEY=...
AUTH_EMAIL_FROM="Rush <no-reply@your-verified-domain.example>"
AUTH_CODE_SECRET=long-random-secret
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...
```

1. In Resend, verify the sender domain used by `AUTH_EMAIL_FROM` and create an API key that can send email.
2. In Twilio, create a Verify service and use its service SID. Complete any required SMS sender, consent, and compliance setup before messaging real people.
3. Add the values in your host's secret/variable settings, then redeploy. Never use `NEXT_PUBLIC_*` for these variables.

Without these values, the app returns a clear setup error instead of falsely marking an email or phone as confirmed. `chapter_messages` is stored in SQLite and powers the PNM/chair chat screens; clients poll the secured message API for new messages, so chats survive refreshes and navigation.

## Deploy

Use a host that provides a persistent writable volume for the SQLite database and profile photos. The included `Dockerfile` and `railway.toml` are ready for Railway or another Docker host:

1. Deploy the repository with the Dockerfile.
2. Attach a persistent volume at `/app/data`.
3. On a shareable demo deployment, set `SEED_DEMO_DATA=true` before the first start. The container loads the tracked sample PNMs once, then writes `data/.demo-seeded` so later restarts do not overwrite data.
4. Use the host's generated HTTPS domain for `/pnm` and `/member`.

Do not deploy this SQLite version to an ephemeral serverless filesystem: profile, RSVP, event, and photo data would be lost on a restart or redeploy.

## Production check

```bash
npm run build
```

The app uses provider-backed email and phone verification for new profiles when the variables above are configured. SQLite persistence is local to the host, and durable production use still depends on a protected persistent volume, appropriate privacy/retention practices, approved messaging consent, secure photo storage, and completed check-in validation.
