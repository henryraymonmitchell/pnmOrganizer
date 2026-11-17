import { NextRequest, NextResponse } from "next/server";
import { AuthError, normalizePhone, requireVerifiedEmailSession, verifyPhoneVerification } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const session = requireVerifiedEmailSession(request);
    const phone = normalizePhone(values.phone);
    await verifyPhoneVerification(session, phone, values.code);
    return NextResponse.json({ verified: true, phone });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "We could not verify that phone code. Please try again." }, { status: 500 });
  }
}
