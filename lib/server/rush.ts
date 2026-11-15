import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { RushProgressStage } from "@/lib/rush-domain";
import { getDatabase } from "@/lib/server/sqlite";

export type RushEventRow = {
  id: string;
  rush_cycle_id: string;
  chapter_name: string;
  event_type: RushProgressStage;
  address: string;
  starts_at: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function getActiveRushCycleId(database = getDatabase()) {
  const cycle = database.prepare("SELECT id FROM rush_cycles WHERE status = 'active'").get() as { id: string } | undefined;
  if (!cycle) throw new Error("There is no active rush cycle.");
  return cycle.id;
}

export function ensureOpenInviteProgress(
  pnmId: string,
  chapterName: string,
  actorId: string | null = null,
  database: Database.Database = getDatabase(),
) {
  const cycleId = getActiveRushCycleId(database);
  const existing = database.prepare(`
    SELECT status FROM pnm_chapter_progress
    WHERE rush_cycle_id = ? AND chapter_name = ? AND pnm_id = ?
  `).get(cycleId, chapterName, pnmId) as { status: RushProgressStage } | undefined;
  if (existing) return existing.status;

  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO pnm_chapter_progress (
      rush_cycle_id, chapter_name, pnm_id, status, created_at, updated_at, updated_by
    ) VALUES (?, ?, ?, 'open invite', ?, ?, ?)
  `).run(cycleId, chapterName, pnmId, now, now, actorId);
  database.prepare(`
    INSERT INTO pnm_progress_history (
      id, rush_cycle_id, chapter_name, pnm_id, previous_status, new_status, changed_by, changed_at
    ) VALUES (?, ?, ?, ?, NULL, 'open invite', ?, ?)
  `).run(randomUUID(), cycleId, chapterName, pnmId, actorId, now);
  return "open invite" as const;
}

export function setPnmChapterProgress(
  pnmId: string,
  chapterName: string,
  status: RushProgressStage,
  actorId: string,
  database: Database.Database = getDatabase(),
) {
  const cycleId = getActiveRushCycleId(database);
  const prior = database.prepare(`
    SELECT status FROM pnm_chapter_progress
    WHERE rush_cycle_id = ? AND chapter_name = ? AND pnm_id = ?
  `).get(cycleId, chapterName, pnmId) as { status: RushProgressStage } | undefined;

  if (!prior) {
    ensureOpenInviteProgress(pnmId, chapterName, actorId, database);
  }
  const current = (prior?.status ?? "open invite") as RushProgressStage;
  if (current === status) return current;

  const now = new Date().toISOString();
  database.prepare(`
    UPDATE pnm_chapter_progress SET status = ?, updated_at = ?, updated_by = ?
    WHERE rush_cycle_id = ? AND chapter_name = ? AND pnm_id = ?
  `).run(status, now, actorId, cycleId, chapterName, pnmId);
  database.prepare(`
    INSERT INTO pnm_progress_history (
      id, rush_cycle_id, chapter_name, pnm_id, previous_status, new_status, changed_by, changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), cycleId, chapterName, pnmId, current, status, actorId, now);
  return status;
}

export function insertEvent(input: Omit<RushEventRow, "rush_cycle_id" | "created_at" | "updated_at">) {
  const database = getDatabase();
  const cycleId = getActiveRushCycleId(database);
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO events (
      id, rush_cycle_id, chapter_name, event_type, address, starts_at, ends_at,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    cycleId,
    input.chapter_name,
    input.event_type,
    input.address,
    input.starts_at,
    input.ends_at,
    input.created_by,
    now,
    now,
  );
  return database.prepare("SELECT * FROM events WHERE id = ?").get(input.id) as RushEventRow;
}

export function getEventById(id: string, database = getDatabase()) {
  return database.prepare("SELECT * FROM events WHERE id = ?").get(id) as RushEventRow | undefined;
}
