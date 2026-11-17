import { NextRequest, NextResponse } from "next/server";
import { authSessionDto } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const session = authSessionDto(request);
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(session);
}
