import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import demoProfiles from "../demo-data/pnms.json";
import { RUSH_PROGRESS_STAGES, isRushProgressStage, type RushProgressStage } from "../lib/rush-domain";
import { getDatabase } from "../lib/server/sqlite";

type DemoProfile = {
  id: string;
  full_name: string;
  hometown: string;
  major: string;
  funny_question_answer: string | null;
  phone: string;
  photo: string;
  chapter_name: string;
  status: RushProgressStage;
};

const profiles = demoProfiles as DemoProfile[];
const photoDirectory = resolve("data/profile-photos");
mkdirSync(photoDirectory, { recursive: true });

for (const profile of profiles) {
  if (!isRushProgressStage(profile.status)) throw new Error(`Invalid rush stage for ${profile.full_name}.`);
  copyFileSync(resolve("demo-data/profile-photos", profile.photo), resolve(photoDirectory, profile.photo));
}

const database = getDatabase();

try {
  const activeCycle = database.prepare("SELECT id FROM rush_cycles WHERE status = 'active'").get() as { id: string } | undefined;
  if (!activeCycle) throw new Error("Could not find an active rush cycle.");

  const now = new Date().toISOString();
  const seedProfiles = database.transaction(() => {
    const upsertProfile = database.prepare(`
      INSERT INTO profiles (
        id, role, full_name, hometown, major, funny_question_answer,
        phone, photo_path, created_at, updated_at
      ) VALUES (?, 'PNM', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        full_name = excluded.full_name,
        hometown = excluded.hometown,
        major = excluded.major,
        funny_question_answer = excluded.funny_question_answer,
        phone = excluded.phone,
        photo_path = excluded.photo_path,
        updated_at = excluded.updated_at
    `);
    const addHouse = database.prepare("INSERT OR IGNORE INTO profile_houses (profile_id, house_name) VALUES (?, ?)");
    const addProgress = database.prepare(`
      INSERT OR IGNORE INTO pnm_chapter_progress (
        rush_cycle_id, chapter_name, pnm_id, status, created_at, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `);
    const addHistory = database.prepare(`
      INSERT INTO pnm_progress_history (
        id, rush_cycle_id, chapter_name, pnm_id, previous_status, new_status, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    `);

    for (const profile of profiles) {
      const photoPath = `data/profile-photos/${profile.photo}`;
      upsertProfile.run(
        profile.id,
        profile.full_name,
        profile.hometown,
        profile.major,
        profile.funny_question_answer,
        profile.phone,
        photoPath,
        now,
        now,
      );
      addHouse.run(profile.id, profile.chapter_name);
      const progress = addProgress.run(
        activeCycle.id,
        profile.chapter_name,
        profile.id,
        profile.status,
        now,
        now,
      );

      if (progress.changes) {
        const targetIndex = RUSH_PROGRESS_STAGES.indexOf(profile.status);
        let previousStatus: RushProgressStage | null = null;
        for (let index = 0; index < RUSH_PROGRESS_STAGES.length; index += 1) {
          if (index > targetIndex) break;
          const status = RUSH_PROGRESS_STAGES[index];
          addHistory.run(
            randomUUID(),
            activeCycle.id,
            profile.chapter_name,
            profile.id,
            previousStatus,
            status,
            new Date(Date.parse(now) + index).toISOString(),
          );
          previousStatus = status;
        }
      }
    }
  });

  seedProfiles();
  console.log(`Loaded ${profiles.length} demo PNMs and portraits into data/rush.sqlite.`);
} finally {
  database.close();
}
