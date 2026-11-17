import { NextRequest, NextResponse } from "next/server";
import { AuthError, normalizeCalPolyEmail, setAuthSessionCookie, verifyEmailVerification } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const email = normalizeCalPolyEmail(values.email);
    const { token, session } = verifyEmailVerification(email, values.code);
    const response = NextResponse.json({
      email: session.email,
      email_verified: true,
      phone: session.phone,
      phone_verified: Boolean(session.phone_verified_at),
      profile_id: session.profile_id,
    });
    return setAuthSessionCookie(response, token);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "We could not verify that email code. Please try again." }, { status: 500 });
  }
}
