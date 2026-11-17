import { NextRequest, NextResponse } from "next/server";
import { AuthError, normalizeCalPolyEmail, startEmailVerification } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const email = normalizeCalPolyEmail(body && typeof body === "object" ? (body as Record<string, unknown>).email : null);
    await startEmailVerification(email);
    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "We could not start email confirmation. Please try again." }, { status: 500 });
  }
}
