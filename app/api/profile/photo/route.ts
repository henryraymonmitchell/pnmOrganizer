import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getProfileById } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_DIRECTORY = resolve("data/profile-photos");

export async function GET(request: NextRequest) {
  try {
    const id = request.cookies.get("rush_profile_id")?.value;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    const profile = getProfileById(id);
    if (!profile?.photo_path) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    const filePath = resolve(profile.photo_path);
    if (!filePath.startsWith(`${PHOTO_DIRECTORY}${sep}`)) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    const photo = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(photo, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}
