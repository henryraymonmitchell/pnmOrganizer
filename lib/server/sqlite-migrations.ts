import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { chapterNames } from "../chapters";
import { RUSH_PROGRESS_STAGES } from "../rush-domain";

const RUSH_SCHEMA_VERSION = 3;

export function applySqliteMigrations(database: Database.Database) {
  const currentVersion = database.pragma("user_version", { simple: true }) as number;
  if (currentVersion < 1) {
    const migrateRushTables = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS chapters (
          name TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS rush_cycles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
          created_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS one_active_rush_cycle_idx
          ON rush_cycles(status) WHERE status = 'active';

        CREATE TABLE IF NOT EXISTS rush_stages (
          value TEXT PRIMARY KEY,
          stage_order INTEGER NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS pnm_chapter_progress (
          rush_cycle_id TEXT NOT NULL REFERENCES rush_cycles(id),
          chapter_name TEXT NOT NULL REFERENCES chapters(name),
          pnm_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          status TEXT NOT NULL REFERENCES rush_stages(value),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
          PRIMARY KEY (rush_cycle_id, chapter_name, pnm_id)
        );
        CREATE INDEX IF NOT EXISTS pnm_chapter_progress_chapter_idx
          ON pnm_chapter_progress(rush_cycle_id, chapter_name, status);

        CREATE TABLE IF NOT EXISTS pnm_progress_history (
          id TEXT PRIMARY KEY,
          rush_cycle_id TEXT NOT NULL REFERENCES rush_cycles(id),
          chapter_name TEXT NOT NULL REFERENCES chapters(name),
          pnm_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          previous_status TEXT REFERENCES rush_stages(value),
          new_status TEXT NOT NULL REFERENCES rush_stages(value),
          changed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
          changed_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS pnm_progress_history_lookup_idx
          ON pnm_progress_history(rush_cycle_id, chapter_name, pnm_id, changed_at);

        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          rush_cycle_id TEXT NOT NULL REFERENCES rush_cycles(id),
          chapter_name TEXT NOT NULL REFERENCES chapters(name),
          event_type TEXT NOT NULL REFERENCES rush_stages(value),
          address TEXT NOT NULL,
          starts_at TEXT NOT NULL,
          ends_at TEXT NOT NULL,
          created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (ends_at > starts_at)
        );
        CREATE INDEX IF NOT EXISTS events_chapter_start_idx
          ON events(rush_cycle_id, chapter_name, starts_at);

        CREATE TABLE IF NOT EXISTS event_signups (
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          pnm_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          signed_up_at TEXT NOT NULL,
          PRIMARY KEY (event_id, pnm_id)
        );
        CREATE INDEX IF NOT EXISTS event_signups_pnm_idx
          ON event_signups(pnm_id, signed_up_at);
      `);

      const insertChapter = database.prepare("INSERT OR IGNORE INTO chapters (name) VALUES (?)");
      for (const chapterName of chapterNames) insertChapter.run(chapterName);
      const insertStage = database.prepare("INSERT OR IGNORE INTO rush_stages (value, stage_order) VALUES (?, ?)");
      RUSH_PROGRESS_STAGES.forEach((stage, index) => insertStage.run(stage, index + 1));
      database.pragma(`user_version = ${RUSH_SCHEMA_VERSION}`);
    });
    migrateRushTables();
  }

  if (currentVersion < 2) {
    const migrateIdentity = database.transaction(() => {
      database.exec(`
        ALTER TABLE profiles ADD COLUMN email TEXT;
        ALTER TABLE profiles ADD COLUMN email_verified_at TEXT;
        ALTER TABLE profiles ADD COLUMN phone_verified_at TEXT;

        CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
          ON profiles(email) WHERE email IS NOT NULL;

        CREATE TABLE IF NOT EXISTS auth_email_challenges (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at TEXT NOT NULL,
          consumed_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS auth_email_challenges_email_created_idx
          ON auth_email_challenges(email, created_at DESC);

        CREATE TABLE IF NOT EXISTS auth_sessions (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          email_verified_at TEXT NOT NULL,
          phone TEXT,
          phone_verified_at TEXT,
          profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS auth_sessions_profile_idx
          ON auth_sessions(profile_id);
        CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
          ON auth_sessions(expires_at);
      `);
      database.pragma("user_version = 2");
    });
    migrateIdentity();
  }

  if (currentVersion < 3) {
    const migrateMessages = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS chapter_messages (
          id TEXT PRIMARY KEY,
          chapter_name TEXT NOT NULL REFERENCES chapters(name),
          pnm_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          sender_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL,
          read_at TEXT
        );
        CREATE INDEX IF NOT EXISTS chapter_messages_thread_idx
          ON chapter_messages(chapter_name, pnm_id, created_at);
        CREATE INDEX IF NOT EXISTS chapter_messages_unread_idx
          ON chapter_messages(chapter_name, pnm_id, read_at);
      `);
      database.pragma("user_version = 3");
    });
    migrateMessages();
  }

  seedActiveCycle(database);
}

function seedActiveCycle(database: Database.Database) {
  const now = new Date().toISOString();
  const cycleName = process.env.RUSH_CYCLE_NAME?.trim() || "Fall 2026";
  let cycle = database.prepare("SELECT id FROM rush_cycles WHERE name = ?").get(cycleName) as { id: string } | undefined;
  if (!cycle) {
    database.prepare("UPDATE rush_cycles SET status = 'archived' WHERE status = 'active'").run();
    const id = randomUUID();
    database.prepare("INSERT INTO rush_cycles (id, name, status, created_at) VALUES (?, ?, 'active', ?)")
      .run(id, cycleName, now);
    cycle = { id };
  } else {
    database.prepare("UPDATE rush_cycles SET status = 'archived' WHERE status = 'active' AND id != ?")
      .run(cycle.id);
    database.prepare("UPDATE rush_cycles SET status = 'active' WHERE id = ?").run(cycle.id);
  }
  const cycleId = cycle.id;

  const legacyAssociations = database.prepare(`
    SELECT p.id AS pnm_id, h.house_name AS chapter_name
    FROM profiles p JOIN profile_houses h ON h.profile_id = p.id
    WHERE p.role = 'PNM'
  `).all() as { pnm_id: string; chapter_name: string }[];
  const insertProgress = database.prepare(`
    INSERT OR IGNORE INTO pnm_chapter_progress (
      rush_cycle_id, chapter_name, pnm_id, status, created_at, updated_at, updated_by
    ) VALUES (?, ?, ?, 'open invite', ?, ?, NULL)
  `);
  const insertProgressHistory = database.prepare(`
    INSERT INTO pnm_progress_history (
      id, rush_cycle_id, chapter_name, pnm_id, previous_status, new_status, changed_by, changed_at
    ) VALUES (?, ?, ?, ?, NULL, 'open invite', NULL, ?)
  `);
  for (const { pnm_id, chapter_name } of legacyAssociations) {
    const result = insertProgress.run(cycleId, chapter_name, pnm_id, now, now);
    if (result.changes) insertProgressHistory.run(randomUUID(), cycleId, chapter_name, pnm_id, now);
  }

  seedDeltaUpsilonDemoEvents(database, cycleId);
}

function seedDeltaUpsilonDemoEvents(database: Database.Database, cycleId: string) {
  const hasOpenInviteEvents = database.prepare(`
    SELECT 1 FROM events
    WHERE rush_cycle_id = ? AND chapter_name = 'Delta Upsilon' AND event_type = 'open invite'
    LIMIT 1
  `).get(cycleId);
  if (hasOpenInviteEvents) return;

  const now = new Date().toISOString();
  const insertEvent = database.prepare(`
    INSERT INTO events (
      id, rush_cycle_id, chapter_name, event_type, address, starts_at, ends_at,
      created_by, created_at, updated_at
    ) VALUES (?, ?, 'Delta Upsilon', 'open invite', ?, ?, ?, NULL, ?, ?)
  `);
  const demoAddress = 'Demo location — Delta Upsilon, San Luis Obispo, CA';
  const demoEvents = [2, 4].map((daysFromNow) => {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + daysFromNow);
    startsAt.setHours(18, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    return { id: randomUUID(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  });

  for (const event of demoEvents) {
    insertEvent.run(event.id, cycleId, demoAddress, event.startsAt, event.endsAt, now, now);
  }
}
