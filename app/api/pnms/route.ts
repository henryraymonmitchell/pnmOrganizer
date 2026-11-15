import { NextRequest, NextResponse } from "next/server";
import { getProfileById, searchPnmDirectory } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canReadPnmDirectory(request: NextRequest) {
  const id = request.cookies.get("rush_profile_id")?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const profile = getProfileById(id);
  return profile?.role === "Active Member" || profile?.role === "Rush Chair" || profile?.role === "IFC Admin";
}

export async function GET(request: NextRequest) {
  if (!canReadPnmDirectory(request)) {
    return NextResponse.json({ error: "Member access is required to view PNMs." }, { status: 403 });
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const pnms = searchPnmDirectory(query).map((pnm) => ({
    id: pnm.id,
    name: pnm.full_name,
    hometown: pnm.hometown ?? "Not provided",
    major: pnm.major ?? "Not provided",
    image: pnm.photo_path ? `/api/pnms/${pnm.id}/photo` : "",
  }));
  return NextResponse.json({ pnms });
}
