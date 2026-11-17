import { NextRequest, NextResponse } from "next/server";
import { AuthError, normalizePhone, requireVerifiedEmailSession, startPhoneVerification } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const session = requireVerifiedEmailSession(request);
    const phone = normalizePhone(body && typeof body === "object" ? (body as Record<string, unknown>).phone : null);
    await startPhoneVerification(session, phone);
    return NextResponse.json({ sent: true, phone });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "We could not start phone confirmation. Please try again." }, { status: 500 });
  }
}
