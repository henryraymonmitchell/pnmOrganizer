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

Open [http://localhost:3000/pnm](http://localhost:3000/pnm) for the PNM portal or [http://localhost:3000/member](http://localhost:3000/member) for the active-member workspace. The root route redirects to the PNM portal.

## Production check

```bash
npm run build
```

The current version is a polished UI prototype. Authentication, Supabase data policies, QR token validation, and SMS delivery are the next integration layer.
