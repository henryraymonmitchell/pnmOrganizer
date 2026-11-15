#!/bin/sh
set -eu

mkdir -p data/profile-photos

# The tracked demo fixture is useful for a shareable prototype, but it should
# never overwrite production data. A persistent marker makes this opt-in seed
# run exactly once per mounted data volume.
if [ "${SEED_DEMO_DATA:-false}" = "true" ] && [ ! -f data/.demo-seeded ]; then
  npm run seed:demo
  touch data/.demo-seeded
fi

exec npm run start
