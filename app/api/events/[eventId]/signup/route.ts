import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/sqlite";
import { ensureOpenInviteProgress, getActiveRushCycleId, getEventById } from "@/lib/server/rush";
import { getRequestProfile } from "@/lib/server/request-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { eventId: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const profile = getRequestProfile(request);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (profile.role !== "PNM") return NextResponse.json({ error: "Only PNMs can sign up for events." }, { status: 403 });

    const database = getDatabase();
    const event = getEventById(params.eventId, database);
    if (!event || event.rush_cycle_id !== getActiveRushCycleId(database)) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    const currentProgress = database.prepare(`
      SELECT status FROM pnm_chapter_progress
      WHERE rush_cycle_id = ? AND chapter_name = ? AND pnm_id = ?
    `).get(event.rush_cycle_id, event.chapter_name, profile.id) as { status: string } | undefined;
    if (event.event_type !== "open invite" && currentProgress?.status !== event.event_type) {
      return NextResponse.json({ error: "You are not eligible for this event." }, { status: 403 });
    }

    const signup = database.transaction(() => {
      if (event.event_type === "open invite") {
        const association = database.prepare("INSERT OR IGNORE INTO profile_houses (profile_id, house_name) VALUES (?, ?)")
          .run(profile.id, event.chapter_name);
        if (association.changes) {
          database.prepare("UPDATE profiles SET updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), profile.id);
        }
        ensureOpenInviteProgress(profile.id, event.chapter_name, profile.id, database);
      }
      database.prepare(`
        INSERT OR IGNORE INTO event_signups (event_id, pnm_id, signed_up_at) VALUES (?, ?, ?)
      `).run(event.id, profile.id, new Date().toISOString());
    });
    signup();
    return NextResponse.json({ event_id: event.id, signed_up: true });
  } catch {
    return NextResponse.json({ error: "Could not save the event sign-up." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const profile = getRequestProfile(request);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (profile.role !== "PNM") return NextResponse.json({ error: "Only PNMs can cancel event sign-ups." }, { status: 403 });

    const database = getDatabase();
    const event = getEventById(params.eventId, database);
    if (!event || event.rush_cycle_id !== getActiveRushCycleId(database)) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    database.prepare("DELETE FROM event_signups WHERE event_id = ? AND pnm_id = ?").run(event.id, profile.id);
    return NextResponse.json({ event_id: event.id, signed_up: false });
  } catch {
    return NextResponse.json({ error: "Could not cancel the event sign-up." }, { status: 500 });
  }
}
