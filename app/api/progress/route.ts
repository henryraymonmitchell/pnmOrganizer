import { NextRequest, NextResponse } from "next/server";
import { chapterNames } from "@/lib/chapters";
import { allowedProgressUpdates, isRushProgressStage, type RushProgressStage } from "@/lib/rush-domain";
import { getDatabase } from "@/lib/server/sqlite";
import { getActiveRushCycleId, setPnmChapterProgress } from "@/lib/server/rush";
import { getRequestProfile } from "@/lib/server/request-profile";
import { getProfileById } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const actor = getRequestProfile(request);
    if (!actor) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (actor.role !== "Rush Chair" && actor.role !== "IFC Admin") {
      return NextResponse.json({ error: "Only rush chairs and IFC admins can update PNM progress." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Enter progress details." }, { status: 400 });
    const values = body as Record<string, unknown>;
    const pnmId = typeof values.pnm_id === "string" ? values.pnm_id : "";
    const chapterName = typeof values.chapter_name === "string" ? values.chapter_name : "";
    const status = values.status;
    if (!/^[0-9a-f-]{36}$/i.test(pnmId) || !chapterNames.includes(chapterName) || !isRushProgressStage(status)) {
      return NextResponse.json({ error: "Enter a valid PNM, chapter, and progress stage." }, { status: 400 });
    }
    if (actor.role !== "IFC Admin" && !actor.associated_houses.includes(chapterName)) {
      return NextResponse.json({ error: "You can only update progress for your chapter." }, { status: 403 });
    }
    const pnm = getProfileById(pnmId);
    if (!pnm || pnm.role !== "PNM" || !pnm.associated_houses.includes(chapterName)) {
      return NextResponse.json({ error: "PNM was not found in this chapter." }, { status: 404 });
    }

    const database = getDatabase();
    const currentRow = database.prepare(`
      SELECT status FROM pnm_chapter_progress
      WHERE rush_cycle_id = ? AND chapter_name = ? AND pnm_id = ?
    `).get(getActiveRushCycleId(database), chapterName, pnmId) as { status: RushProgressStage } | undefined;
    if (!allowedProgressUpdates(currentRow?.status ?? null).includes(status)) {
      return NextResponse.json({ error: "Progress can stay at its current stage or advance one stage at a time." }, { status: 400 });
    }
    const update = database.transaction(() => setPnmChapterProgress(pnmId, chapterName, status, actor.id, database));
    const savedStatus = update();
    return NextResponse.json({ pnm_id: pnmId, chapter_name: chapterName, status: savedStatus, rush_cycle_id: getActiveRushCycleId(database) });
  } catch {
    return NextResponse.json({ error: "Could not update PNM progress." }, { status: 500 });
  }
}
