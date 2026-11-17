import { getDatabase } from "@/lib/server/sqlite";
import { ensureOpenInviteProgress } from "@/lib/server/rush";
import type { ProfileRole } from "@/lib/profile-domain";

export type ProfileRow = {
  id: string;
  role: ProfileRole;
  full_name: string;
  email: string | null;
  email_verified_at: string | null;
  hometown: string | null;
  major: string | null;
  funny_question_answer: string | null;
  phone: string;
  phone_verified_at: string | null;
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

export function getProfileByEmail(email: string): StoredProfile | null {
  const database = getDatabase();
  const row = database.prepare("SELECT id FROM profiles WHERE email = ?").get(email) as { id: string } | undefined;
  return row ? getProfileById(row.id) : null;
}

export type PnmDirectoryProfile = Pick<ProfileRow, "id" | "full_name" | "hometown" | "major" | "photo_path">;

export function searchPnmDirectory(query: string): PnmDirectoryProfile[] {
  const database = getDatabase();
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const conditions = terms.map(() => "(LOWER(full_name) LIKE ? OR LOWER(COALESCE(hometown, '')) LIKE ? OR LOWER(COALESCE(major, '')) LIKE ?)");
  const parameters = terms.flatMap((term) => {
    const pattern = `%${term}%`;
    return [pattern, pattern, pattern];
  });
  return database.prepare(`
    SELECT id, full_name, hometown, major, photo_path
    FROM profiles
    WHERE role = 'PNM' ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
    ORDER BY full_name COLLATE NOCASE
    LIMIT 100
  `).all(...parameters) as PnmDirectoryProfile[];
}

export function saveProfile(input: ProfileInput, progressActorId: string | null = null): StoredProfile {
  const database = getDatabase();
  const now = new Date().toISOString();
  const { associated_houses, ...profileFields } = input;
  const save = database.transaction(() => {
    database.prepare(`
      INSERT INTO profiles (
        id, role, full_name, email, email_verified_at, hometown, major, funny_question_answer,
        phone, phone_verified_at, photo_path, created_at, updated_at
      ) VALUES (
        @id, @role, @full_name, @email, @email_verified_at, @hometown, @major, @funny_question_answer,
        @phone, @phone_verified_at, @photo_path, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        full_name = excluded.full_name,
        email = excluded.email,
        email_verified_at = excluded.email_verified_at,
        hometown = excluded.hometown,
        major = excluded.major,
        funny_question_answer = excluded.funny_question_answer,
        phone = excluded.phone,
        phone_verified_at = excluded.phone_verified_at,
        photo_path = excluded.photo_path,
        updated_at = excluded.updated_at
    `).run({ ...profileFields, updated_at: now, created_at: input.created_at ?? now });

    database.prepare("DELETE FROM profile_houses WHERE profile_id = ?").run(input.id);
    const insertHouse = database.prepare(
      "INSERT INTO profile_houses (profile_id, house_name) VALUES (?, ?)",
    );
    for (const house of associated_houses) {
      insertHouse.run(input.id, house);
      if (input.role === "PNM") ensureOpenInviteProgress(input.id, house, progressActorId, database);
    }
  });

  save();
  const profile = getProfileById(input.id);
  if (!profile) throw new Error("Profile save did not return a record.");
  return profile;
}
