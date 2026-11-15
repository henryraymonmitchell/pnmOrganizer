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

The cookie is a local prototype identity token, not authentication. Add real identity and authorization before using this API for public or sensitive production data.
