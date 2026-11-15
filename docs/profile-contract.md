# Profile persistence contract

The prototype stores profile records in SQLite at `data/rush.sqlite` by default. Set `SQLITE_DB_PATH` to use a different file. Uploaded profile photos are stored under `data/profile-photos` and served through the profile photo endpoint.

## Endpoints

### `GET /api/profile`

Returns the profile associated with the current browser's `rush_profile_id` cookie.

- `200`: returns a profile object.
- `404`: no profile is associated with this browser.

### `POST /api/profile`

Creates a profile, or updates the profile already associated with this browser. Send `multipart/form-data` with:

| Field | Shape | Required |
| --- | --- | --- |
| `role` | `IFC Admin`, `Rush Chair`, `Active Member`, or `PNM` | Yes |
| `full_name` | Text | Yes |
| `phone` | E.164 text, such as `+13428765643` | Yes |
| `hometown` | Text | No |
| `major` | Text | No |
| `associated_houses` | JSON array of recognized chapter names | Yes |
| `funny_question_answer` | Text | No |
| `photo` | JPG, PNG, or WebP file up to 5 MB | No |

House rules are checked on the server: IFC Admin is associated with all recognized houses, Rush Chair and Active Member require exactly one, and PNM can select any number. A missing photo preserves the current photo when updating.

### `PATCH /api/profile`

Updates the profile associated with the current browser. Uses the same multipart fields and validation as `POST`. Returns `404` if the browser has no saved profile.

Successful responses return `id` (server-generated UUID), `role`, `full_name`, `hometown`, `major`, `associated_houses`, `funny_question_answer`, `phone`, `photo_url`, `created_at`, and `updated_at`. Timestamps are ISO 8601 UTC strings. The on-disk `photo_path` stays server-side; `photo_url` is `/api/profile/photo` when a photo exists.

Validation errors return `400` with `{ "error": "..." }`. Unexpected storage errors return `500` with the same shape. Profile photos are read from `GET /api/profile/photo` using the browser cookie.

### `DELETE /api/profile`

Clears the current browser's profile cookie and returns `{ "signed_out": true }`. It keeps the profile row in SQLite, so a demo presenter can switch profiles without deleting saved data.

The cookie is a local prototype identity token, not authentication. Add real identity and authorization before using this API for public or sensitive production data.

## Chapter progress and events

SQLite migrations add `chapters`, `rush_cycles`, `rush_stages`, `pnm_chapter_progress`, `pnm_progress_history`, `events`, and `event_signups`. Progress belongs to a PNM, chapter, and rush cycle. Event start and end values are stored as ISO 8601 UTC timestamps.

Progress and event types use these exact values: `open invite`, `closed invite day 1`, `closed invite day 2`, `closed invite day 3`, and `bid night`. Rush chair updates can keep the current stage or advance one stage at a time; every change is appended to `pnm_progress_history` with its actor and timestamp.

### `GET /api/chapters`

Returns the recognized chapter names from the SQLite `chapters` table. The client adds its local branding colors and short marks to those saved names.

### `GET /api/profiles?chapter={chapterName}`

Returns saved PNM profiles associated with the requested chapter. Rush chairs and active members can only query their own chapter; IFC Admin can query any recognized chapter or omit the filter to see all. PNM phone numbers are not included. Photo URLs are available only to the PNM or a member associated with one of their chapters.

### `POST /api/profiles`

Rush chairs and IFC Admin can add a PNM without switching the browser's current profile. Send JSON with `full_name`, `phone` (E.164), optional `hometown` and `major`, and `chapter_name`. The response includes the new UUID and its chapter progress. This creates the profile, associates the chapter, and starts `open invite` progress for the active cycle in one operation.

### `GET /api/events?chapter={chapterName}`

Returns events visible to the current profile. PNMs see open-invite events for their associated chapters and closed-invite events only when their progress matches the event type. Members see events for their associated chapters; IFC Admin can see all chapters. Each event includes its address, event type, ISO start/end timestamps, whether the current PNM is signed up, and the signup count.

### `POST /api/events`

Rush chairs and IFC Admin can create an event by sending JSON with `chapter_name`, `event_type`, `address`, `starts_at`, and `ends_at`. A rush chair may create events only for their chapter. The end must be later than the start.

### `POST` and `DELETE /api/events/{eventId}/signup`

PNMs can sign up for an eligible event or cancel that sign-up. An open-invite sign-up also associates the PNM with the event's chapter and creates `open invite` progress if no progress row exists. If the PNM is already at a later stage, that progress is preserved. Canceling a sign-up does not erase chapter association or progress history.

### `PATCH /api/progress`

Rush chairs and IFC Admin can update progress with JSON `{ "pnm_id", "chapter_name", "status" }`. The PNM must be associated with that chapter. Updates must stay at the current stage or advance to the next stage; earlier progress remains in history.

On first startup, the active cycle defaults to `Fall 2026` (override with `RUSH_CYCLE_NAME`). The app seeds one demo open-invite event per recognized chapter. The seed addresses are placeholders for local pitch/demo use and should be replaced with the actual chapter venue before presenting location details.
