import { NextRequest, NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return clearAuthSession(request, NextResponse.json({ signed_out: true }));
}
