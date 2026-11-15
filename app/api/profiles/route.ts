import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { chapterNames } from "@/lib/chapters";
import type { PnmDirectoryDto } from "@/lib/rush-domain";
import { getDatabase } from "@/lib/server/sqlite";
import { getActiveRushCycleId } from "@/lib/server/rush";
import { getRequestProfile } from "@/lib/server/request-profile";
import { saveProfile } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function directoryDto(profileId: string, fullName: string, hometown: string | null, major: string | null, photoPath: string | null, houses: string[], progress: Record<string, string>): PnmDirectoryDto {
  return {
    id: profileId,
    full_name: fullName,
    hometown,
    major,
    photo_url: photoPath ? `/api/profiles/${profileId}/photo` : null,
    associated_houses: houses,
    progress: progress as PnmDirectoryDto["progress"],
  };
}

export async function GET(request: NextRequest) {
  try {
    const viewer = getRequestProfile(request);
    if (!viewer) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (viewer.role === "PNM") return NextResponse.json({ error: "Member access is required." }, { status: 403 });
    const requestedChapter = request.nextUrl.searchParams.get("chapter");
    if (requestedChapter && !chapterNames.includes(requestedChapter)) {
      return NextResponse.json({ error: "Choose a recognized chapter." }, { status: 400 });
    }
    const houses = viewer.role === "IFC Admin" ? chapterNames : viewer.associated_houses;
    if (requestedChapter && !houses.includes(requestedChapter)) {
      return NextResponse.json({ error: "You do not have access to this chapter." }, { status: 403 });
    }
    const filterHouses = requestedChapter ? [requestedChapter] : houses;
    if (!filterHouses.length) return NextResponse.json([] satisfies PnmDirectoryDto[]);

    const database = getDatabase();
    const cycleId = getActiveRushCycleId(database);
    const placeholders = filterHouses.map(() => "?").join(", ");
    const records = database.prepare(`
      SELECT DISTINCT p.id, p.full_name, p.hometown, p.major, p.photo_path
      FROM profiles p
      JOIN profile_houses h ON h.profile_id = p.id
      WHERE p.role = 'PNM' AND h.house_name IN (${placeholders})
      ORDER BY p.full_name COLLATE NOCASE
    `).all(...filterHouses) as { id: string; full_name: string; hometown: string | null; major: string | null; photo_path: string | null }[];

    const housesForProfile = database.prepare("SELECT house_name FROM profile_houses WHERE profile_id = ? ORDER BY house_name");
    const progressForProfile = database.prepare(`
      SELECT chapter_name, status FROM pnm_chapter_progress
      WHERE rush_cycle_id = ? AND pnm_id = ?
    `);
    const result = records.map((record) => {
      const associatedHouses = (housesForProfile.all(record.id) as { house_name: string }[]).map((row) => row.house_name);
      const progressRows = progressForProfile.all(cycleId, record.id) as { chapter_name: string; status: string }[];
      const progress = Object.fromEntries(progressRows.map((row) => [row.chapter_name, row.status]));
      return directoryDto(record.id, record.full_name, record.hometown, record.major, record.photo_path, associatedHouses, progress);
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not load PNM profiles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const chair = getRequestProfile(request);
    if (!chair) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (chair.role !== "Rush Chair" && chair.role !== "IFC Admin") {
      return NextResponse.json({ error: "Only rush chairs and IFC admins can add a PNM." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Enter PNM details." }, { status: 400 });
    const values = body as Record<string, unknown>;
    const fullName = typeof values.full_name === "string" ? values.full_name.trim() : "";
    const phone = typeof values.phone === "string" ? values.phone.trim() : "";
    const chapterName = typeof values.chapter_name === "string"
      ? values.chapter_name.trim()
      : chair.associated_houses[0] ?? "";
    const hometown = typeof values.hometown === "string" ? values.hometown.trim() : null;
    const major = typeof values.major === "string" ? values.major.trim() : null;

    if (fullName.length < 2) return NextResponse.json({ error: "Enter the PNM's full name." }, { status: 400 });
    if (!PHONE_PATTERN.test(phone)) return NextResponse.json({ error: "Enter a phone number in international format, such as +13428765643." }, { status: 400 });
    if (!chapterNames.includes(chapterName)) return NextResponse.json({ error: "Choose a recognized chapter." }, { status: 400 });
    if (chair.role !== "IFC Admin" && !chair.associated_houses.includes(chapterName)) {
      return NextResponse.json({ error: "You can only add a PNM to your chapter." }, { status: 403 });
    }

    const saved = saveProfile({
      id: randomUUID(),
      role: "PNM",
      full_name: fullName,
      hometown: hometown || null,
      major: major || null,
      funny_question_answer: null,
      phone,
      photo_path: null,
      associated_houses: [chapterName],
    }, chair.id);
    return NextResponse.json(directoryDto(
      saved.id,
      saved.full_name,
      saved.hometown,
      saved.major,
      saved.photo_path,
      saved.associated_houses,
      { [chapterName]: "open invite" },
    ), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the PNM profile." }, { status: 500 });
  }
}
