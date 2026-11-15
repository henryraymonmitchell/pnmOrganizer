import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { chapterNames } from "@/lib/chapters";
import { RUSH_PROGRESS_STAGES } from "@/lib/rush-domain";

const RUSH_SCHEMA_VERSION = 1;

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

  const existingEvent = database.prepare(`
    SELECT 1 FROM events WHERE rush_cycle_id = ? AND chapter_name = ? AND event_type = 'open invite' LIMIT 1
  `);
  const insertEvent = database.prepare(`
    INSERT INTO events (
      id, rush_cycle_id, chapter_name, event_type, address, starts_at, ends_at,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, 'open invite', ?, ?, ?, NULL, ?, ?)
  `);
  const firstOpenInvite = new Date();
  firstOpenInvite.setDate(firstOpenInvite.getDate() + 5);
  firstOpenInvite.setHours(18, 0, 0, 0);
  chapterNames.forEach((chapterName, index) => {
    if (existingEvent.get(cycleId, chapterName)) return;
    const start = new Date(firstOpenInvite);
    start.setMinutes((index % 4) * 30);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const address = `${100 + index} Fraternity Row, San Luis Obispo, CA 93407`;
    insertEvent.run(randomUUID(), cycleId, chapterName, address, start.toISOString(), end.toISOString(), now, now);
  });

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
}
