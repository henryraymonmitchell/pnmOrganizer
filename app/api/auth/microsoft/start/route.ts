import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/server/auth";
import { startMicrosoftLogin } from "@/lib/server/microsoft-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  try {
    return startMicrosoftLogin(request);
  } catch (error) {
    const message = error instanceof AuthError ? error.message : "Microsoft sign-in could not be started. Please try again.";
    const destination = new URL("/", request.nextUrl.origin);
    destination.searchParams.set("auth_error", message);
    return NextResponse.redirect(destination);
  }
}
