import { getDatabase } from "@/lib/server/sqlite";
import type { ProfileRole } from "@/lib/profile-domain";

export type ProfileRow = {
  id: string;
  role: ProfileRole;
  full_name: string;
  hometown: string | null;
  major: string | null;
  funny_question_answer: string | null;
  phone: string;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = Omit<ProfileRow, "created_at" | "updated_at"> & {
  associated_houses: string[];
  created_at?: string;
};

export type StoredProfile = ProfileRow & { associated_houses: string[] };

export function getProfileById(id: string): StoredProfile | null {
  const database = getDatabase();
  const row = database.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
  if (!row) return null;

  const houses = database
    .prepare("SELECT house_name FROM profile_houses WHERE profile_id = ? ORDER BY house_name")
    .all(id) as { house_name: string }[];

  return { ...row, associated_houses: houses.map((house) => house.house_name) };
}

export function saveProfile(input: ProfileInput): StoredProfile {
  const database = getDatabase();
  const now = new Date().toISOString();
  const { associated_houses, ...profileFields } = input;
  const save = database.transaction(() => {
    database.prepare(`
      INSERT INTO profiles (
        id, role, full_name, hometown, major, funny_question_answer,
        phone, photo_path, created_at, updated_at
      ) VALUES (
        @id, @role, @full_name, @hometown, @major, @funny_question_answer,
        @phone, @photo_path, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        full_name = excluded.full_name,
        hometown = excluded.hometown,
        major = excluded.major,
        funny_question_answer = excluded.funny_question_answer,
        phone = excluded.phone,
        photo_path = excluded.photo_path,
        updated_at = excluded.updated_at
    `).run({ ...profileFields, updated_at: now, created_at: input.created_at ?? now });

    database.prepare("DELETE FROM profile_houses WHERE profile_id = ?").run(input.id);
    const insertHouse = database.prepare(
      "INSERT INTO profile_houses (profile_id, house_name) VALUES (?, ?)",
    );
    for (const house of associated_houses) insertHouse.run(input.id, house);
  });

  save();
  const profile = getProfileById(input.id);
  if (!profile) throw new Error("Profile save did not return a record.");
  return profile;
}
