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

After the server starts, open these local routes in the same browser/device running `npm run dev`:

- PNM portal: `http://localhost:3000/pnm`
- Active-member workspace: `http://localhost:3000/member`

The root route redirects to the PNM portal. These are local development URLs, so they do not work when clicked from GitHub unless the app is running on your computer.

## Deploy

To make the app available from a public README link, deploy this Next.js project to Vercel, then replace the local URLs above with the deployed domain's `/pnm` and `/member` routes.

## Production check

```bash
npm run build
```

The current version is a polished UI prototype. Authentication, Supabase data policies, QR token validation, and SMS delivery are the next integration layer.
