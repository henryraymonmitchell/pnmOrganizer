import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applySqliteMigrations } from "./sqlite-migrations";

declare global {
  // Keep one connection during Next.js development hot reloads.
  var rushSqlite: Database.Database | undefined;
}

function openDatabase() {
  const configuredPath = process.env.SQLITE_DB_PATH;
  const databasePath = configuredPath === ":memory:"
    ? configuredPath
    : resolve(configuredPath ?? "data/rush.sqlite");

  if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  database.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('IFC Admin', 'Rush Chair', 'Active Member', 'PNM')),
      full_name TEXT NOT NULL,
      hometown TEXT,
      major TEXT,
      funny_question_answer TEXT,
      phone TEXT NOT NULL,
      photo_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_houses (
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      house_name TEXT NOT NULL,
      PRIMARY KEY (profile_id, house_name)
    );

    CREATE INDEX IF NOT EXISTS profile_houses_house_name_idx
      ON profile_houses(house_name);

  `);
  applySqliteMigrations(database);

  return database;
}

export function getDatabase() {
  if (!globalThis.rushSqlite) globalThis.rushSqlite = openDatabase();
  return globalThis.rushSqlite;
}
