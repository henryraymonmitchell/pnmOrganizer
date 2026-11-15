# Local demo data

The `pnms.json` fixture and portraits recreate 20 fictional PNM profiles for Delta Upsilon, Kappa Sigma, and Sigma Phi Epsilon. Portraits are sample images from the [Random User Generator](https://www.randomuser.me/documentation).

After installing dependencies, run `npm run seed:demo`. This copies the tracked portraits into the ignored local `data/profile-photos` directory and adds the profiles, chapter progress, history, and Delta Upsilon open-invite events to the local SQLite database. It is safe to run again: it does not delete other profiles or sign-ups, and it preserves existing PNM progress. The SQLite database itself remains local and is not checked into Git.
