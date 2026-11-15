import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { chapterNames } from "@/lib/chapters";
import { isRushProgressStage } from "@/lib/rush-domain";
import { getDatabase } from "@/lib/server/sqlite";
import { getActiveRushCycleId, insertEvent } from "@/lib/server/rush";
import { getRequestProfile } from "@/lib/server/request-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function eventDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    chapter_name: row.chapter_name,
    event_type: row.event_type,
    address: row.address,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    signed_up: Boolean(row.signed_up),
    signup_count: Number(row.signup_count ?? 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    const profile = getRequestProfile(request);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const requestedChapter = request.nextUrl.searchParams.get("chapter");
    if (requestedChapter && !chapterNames.includes(requestedChapter)) {
      return NextResponse.json({ error: "Choose a recognized chapter." }, { status: 400 });
    }

    const accessibleHouses = profile.role === "IFC Admin" ? chapterNames : profile.associated_houses;
    if (requestedChapter && !accessibleHouses.includes(requestedChapter)) {
      return NextResponse.json({ error: "You do not have access to this chapter." }, { status: 403 });
    }
    const houses = requestedChapter ? [requestedChapter] : accessibleHouses;
    if (!houses.length) return NextResponse.json([]);

    const database = getDatabase();
    const cycleId = getActiveRushCycleId(database);
    const placeholders = houses.map(() => "?").join(", ");
    const rows = database.prepare(`
      SELECT
        e.*,
        EXISTS (SELECT 1 FROM event_signups s WHERE s.event_id = e.id AND s.pnm_id = ?) AS signed_up,
        (SELECT COUNT(*) FROM event_signups s WHERE s.event_id = e.id) AS signup_count
      FROM events e
      LEFT JOIN pnm_chapter_progress p
        ON p.rush_cycle_id = e.rush_cycle_id AND p.chapter_name = e.chapter_name AND p.pnm_id = ?
      WHERE e.rush_cycle_id = ?
        AND e.chapter_name IN (${placeholders})
        AND (? != 'PNM' OR e.event_type = 'open invite' OR p.status = e.event_type)
      ORDER BY e.starts_at, e.chapter_name
    `).all(profile.id, profile.id, cycleId, ...houses, profile.role) as Record<string, unknown>[];
    return NextResponse.json(rows.map(eventDto));
  } catch {
    return NextResponse.json({ error: "Could not load events." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = getRequestProfile(request);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (profile.role !== "Rush Chair" && profile.role !== "IFC Admin") {
      return NextResponse.json({ error: "Only rush chairs and IFC admins can create events." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Enter event details." }, { status: 400 });
    const values = body as Record<string, unknown>;
    const chapterName = typeof values.chapter_name === "string" ? values.chapter_name.trim() : "";
    const eventType = values.event_type;
    const address = typeof values.address === "string" ? values.address.trim() : "";
    const startValue = typeof values.starts_at === "string" ? values.starts_at : "";
    const endValue = typeof values.ends_at === "string" ? values.ends_at : "";
    const startsAt = Date.parse(startValue);
    const endsAt = Date.parse(endValue);

    if (!chapterNames.includes(chapterName)) return NextResponse.json({ error: "Choose a recognized chapter." }, { status: 400 });
    if (profile.role !== "IFC Admin" && !profile.associated_houses.includes(chapterName)) {
      return NextResponse.json({ error: "You can only create events for your chapter." }, { status: 403 });
    }
    if (!isRushProgressStage(eventType)) return NextResponse.json({ error: "Choose a valid event type." }, { status: 400 });
    if (!address || address.length > 500) return NextResponse.json({ error: "Enter an address under 500 characters." }, { status: 400 });
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
      return NextResponse.json({ error: "Enter a valid start and end time; the end must be later." }, { status: 400 });
    }

    const event = insertEvent({
      id: randomUUID(),
      chapter_name: chapterName,
      event_type: eventType,
      address,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      created_by: profile.id,
    });
    return NextResponse.json(eventDto({ ...event, signed_up: false, signup_count: 0 }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the event." }, { status: 500 });
  }
}
