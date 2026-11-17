import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { chapterNames } from "@/lib/chapters";
import type { ChapterConversationDto, ChapterMessageDto } from "@/lib/message-domain";
import { getRequestProfile } from "@/lib/server/request-profile";
import { getDatabase } from "@/lib/server/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageRow = Omit<ChapterMessageDto, "mine">;

function isMemberMessenger(role: string) {
  return role === "Rush Chair" || role === "IFC Admin";
}

function parseChapter(value: string | null) {
  const chapter = value?.trim() ?? "";
  if (!chapterNames.includes(chapter)) throw new MessageRouteError("Choose a recognized chapter.");
  return chapter;
}

class MessageRouteError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function canUseChapter(viewer: { role: string; associated_houses: string[] }, chapter: string) {
  return viewer.role === "IFC Admin" || viewer.associated_houses.includes(chapter);
}

function isPnmInChapter(pnmId: string, chapter: string) {
  const row = getDatabase().prepare(`
    SELECT 1
    FROM profiles p JOIN profile_houses h ON h.profile_id = p.id
    WHERE p.id = ? AND p.role = 'PNM' AND h.house_name = ?
    LIMIT 1
  `).get(pnmId, chapter);
  return Boolean(row);
}

function messageDto(row: MessageRow, viewerId: string): ChapterMessageDto {
  return { ...row, mine: row.sender_profile_id === viewerId };
}

function errorResponse(error: unknown) {
  if (error instanceof MessageRouteError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Could not load messages. Please try again." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const viewer = getRequestProfile(request);
    if (!viewer) throw new MessageRouteError("Sign in to view messages.", 401);
    const chapter = parseChapter(request.nextUrl.searchParams.get("chapter"));
    if (!canUseChapter(viewer, chapter)) throw new MessageRouteError("You do not have access to this chapter's messages.", 403);

    const database = getDatabase();
    const pnmId = request.nextUrl.searchParams.get("pnm_id");
    if (viewer.role === "PNM") {
      const rows = database.prepare(`
        SELECT id, chapter_name, pnm_id, sender_profile_id, body, created_at
        FROM chapter_messages
        WHERE chapter_name = ? AND pnm_id = ?
        ORDER BY created_at ASC
      `).all(chapter, viewer.id) as MessageRow[];
      database.prepare(`
        UPDATE chapter_messages SET read_at = ?
        WHERE chapter_name = ? AND pnm_id = ? AND sender_profile_id != ? AND read_at IS NULL
      `).run(new Date().toISOString(), chapter, viewer.id, viewer.id);
      return NextResponse.json(rows.map((row) => messageDto(row, viewer.id)));
    }

    if (!isMemberMessenger(viewer.role)) throw new MessageRouteError("Only rush chairs can view chapter messages.", 403);
    if (pnmId) {
      if (!isPnmInChapter(pnmId, chapter)) throw new MessageRouteError("That PNM is not connected to this chapter.", 404);
      const rows = database.prepare(`
        SELECT id, chapter_name, pnm_id, sender_profile_id, body, created_at
        FROM chapter_messages
        WHERE chapter_name = ? AND pnm_id = ?
        ORDER BY created_at ASC
      `).all(chapter, pnmId) as MessageRow[];
      database.prepare(`
        UPDATE chapter_messages SET read_at = ?
        WHERE chapter_name = ? AND pnm_id = ? AND sender_profile_id != ? AND read_at IS NULL
      `).run(new Date().toISOString(), chapter, pnmId, viewer.id);
      return NextResponse.json(rows.map((row) => messageDto(row, viewer.id)));
    }

    const rows = database.prepare(`
      SELECT
        m.pnm_id,
        p.full_name,
        p.photo_path,
        MAX(m.created_at) AS last_message_at,
        (
          SELECT newest.body FROM chapter_messages newest
          WHERE newest.chapter_name = m.chapter_name AND newest.pnm_id = m.pnm_id
          ORDER BY newest.created_at DESC LIMIT 1
        ) AS last_message,
        SUM(CASE WHEN m.sender_profile_id != ? AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread_count
      FROM chapter_messages m
      JOIN profiles p ON p.id = m.pnm_id
      WHERE m.chapter_name = ?
      GROUP BY m.pnm_id, p.full_name, p.photo_path
      ORDER BY last_message_at DESC
    `).all(viewer.id, chapter) as {
      pnm_id: string;
      full_name: string;
      photo_path: string | null;
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }[];
    const conversations: ChapterConversationDto[] = rows.map((row) => ({
      pnm_id: row.pnm_id,
      full_name: row.full_name,
      photo_url: row.photo_path ? `/api/profiles/${row.pnm_id}/photo` : null,
      last_message: row.last_message,
      last_message_at: row.last_message_at,
      unread_count: Number(row.unread_count ?? 0),
    }));
    return NextResponse.json(conversations);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const viewer = getRequestProfile(request);
    if (!viewer) throw new MessageRouteError("Sign in to send a message.", 401);
    const body: unknown = await request.json();
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const chapter = parseChapter(typeof values.chapter_name === "string" ? values.chapter_name : null);
    if (!canUseChapter(viewer, chapter)) throw new MessageRouteError("You do not have access to this chapter's messages.", 403);
    const text = typeof values.body === "string" ? values.body.trim() : "";
    if (!text || text.length > 1500) throw new MessageRouteError("Enter a message up to 1,500 characters.");

    let pnmId: string;
    if (viewer.role === "PNM") {
      pnmId = viewer.id;
    } else if (isMemberMessenger(viewer.role)) {
      pnmId = typeof values.pnm_id === "string" ? values.pnm_id : "";
      if (!pnmId || !isPnmInChapter(pnmId, chapter)) {
        throw new MessageRouteError("Choose a PNM connected to this chapter.", 400);
      }
    } else {
      throw new MessageRouteError("Only PNMs and rush chairs can send chapter messages.", 403);
    }

    const row: MessageRow = {
      id: randomUUID(),
      chapter_name: chapter,
      pnm_id: pnmId,
      sender_profile_id: viewer.id,
      body: text,
      created_at: new Date().toISOString(),
    };
    getDatabase().prepare(`
      INSERT INTO chapter_messages (id, chapter_name, pnm_id, sender_profile_id, body, created_at, read_at)
      VALUES (@id, @chapter_name, @pnm_id, @sender_profile_id, @body, @created_at, NULL)
    `).run(row);
    return NextResponse.json(messageDto(row, viewer.id), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
