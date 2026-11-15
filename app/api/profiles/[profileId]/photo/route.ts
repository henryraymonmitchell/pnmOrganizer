import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getRequestProfile } from "@/lib/server/request-profile";
import { getProfileById } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_DIRECTORY = resolve("data/profile-photos");

type RouteContext = { params: { profileId: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const viewer = getRequestProfile(request);
    const target = getProfileById(params.profileId);
    if (!viewer || !target?.photo_path || target.role !== "PNM") {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }
    const canView = viewer.id === target.id
      || viewer.role === "IFC Admin"
      || (viewer.role !== "PNM" && viewer.associated_houses.some((house) => target.associated_houses.includes(house)));
    if (!canView) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    const filePath = resolve(target.photo_path);
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
