FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 falls back to a native build when a matching prebuild is not
# available for the deployment architecture.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && mkdir -p /app/data/profile-photos \
  && chmod +x /app/scripts/start-container.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Mount persistent storage at /app/data. It holds both rush.sqlite and private
# profile photos, so a redeploy does not erase profile, RSVP, or event data.
CMD ["/app/scripts/start-container.sh"]
