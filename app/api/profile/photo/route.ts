import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getRequestProfile } from "@/lib/server/request-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_DIRECTORY = resolve("data/profile-photos");

export async function GET(request: NextRequest) {
  try {
    const profile = getRequestProfile(request);
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
