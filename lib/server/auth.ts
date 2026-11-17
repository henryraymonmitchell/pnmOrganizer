import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { AuthSessionDto } from "@/lib/auth-domain";
import { getDatabase } from "@/lib/server/sqlite";

export const AUTH_SESSION_COOKIE = "rush_auth_session";

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RESEND_DELAY_MS = 60 * 1000;
const MAX_EMAIL_CODE_ATTEMPTS = 5;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export type AuthSessionRow = {
  id: string;
  token_hash: string;
  email: string;
  email_verified_at: string;
  phone: string | null;
  phone_verified_at: string | null;
  profile_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

type EmailChallengeRow = {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export class AuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "AuthError";
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new AuthError("Verification is not configured yet. Ask an IFC administrator to finish the email and phone provider setup.", 503);
  return value;
}

function hash(value: string) {
  const secret = getAuthCodeSecret();
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function getAuthCodeSecret() {
  return requiredEnv("AUTH_CODE_SECRET");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function toDto(session: AuthSessionRow): AuthSessionDto {
  return {
    email: session.email,
    email_verified: Boolean(session.email_verified_at),
    phone: session.phone,
    phone_verified: Boolean(session.phone_verified_at),
    profile_id: session.profile_id,
  };
}

export function normalizeCalPolyEmail(value: unknown) {
  if (typeof value !== "string") throw new AuthError("Enter your Cal Poly email address.");
  const email = value.trim().toLocaleLowerCase();
  if (!/^[a-z0-9._%+-]+@calpoly\.edu$/i.test(email)) {
    throw new AuthError("Use your @calpoly.edu email address.");
  }
  return email;
}

export function normalizePhone(value: unknown) {
  if (typeof value !== "string" || !PHONE_PATTERN.test(value.trim())) {
    throw new AuthError("Enter a phone number in international format, such as +13428765643.");
  }
  return value.trim();
}

export function getAuthSession(request: NextRequest): AuthSessionRow | null {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  const database = getDatabase();
  const session = database.prepare(`
    SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ?
  `).get(tokenHash(token), new Date().toISOString()) as AuthSessionRow | undefined;
  return session ?? null;
}

export function authSessionDto(request: NextRequest) {
  const session = getAuthSession(request);
  return session ? toDto(session) : null;
}

export function requireVerifiedEmailSession(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session?.email_verified_at) throw new AuthError("Sign in with your verified Cal Poly email first.", 401);
  return session;
}

export function requireVerifiedIdentitySession(request: NextRequest) {
  const session = requireVerifiedEmailSession(request);
  if (!session.phone || !session.phone_verified_at) {
    throw new AuthError("Verify your phone number before saving your profile.", 401);
  }
  return session;
}

export async function startEmailVerification(email: string) {
  const resendKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("AUTH_EMAIL_FROM");
  requiredEnv("AUTH_CODE_SECRET");
  const database = getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const recent = database.prepare(`
    SELECT created_at FROM auth_email_challenges
    WHERE email = ? ORDER BY created_at DESC LIMIT 1
  `).get(email) as { created_at: string } | undefined;
  if (recent && now.getTime() - Date.parse(recent.created_at) < EMAIL_RESEND_DELAY_MS) {
    throw new AuthError("A confirmation code was just sent. Please wait a minute before requesting another.", 429);
  }

  const code = randomInt(100000, 1000000).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Cal Poly Rush confirmation code",
      text: `Your Rush confirmation code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AuthError("We could not send that confirmation email. Check the address or ask an IFC administrator for help.", 502);
  }

  database.prepare(`
    INSERT INTO auth_email_challenges (id, email, code_hash, attempts, expires_at, consumed_at, created_at)
    VALUES (?, ?, ?, 0, ?, NULL, ?)
  `).run(randomUUID(), email, hash(code), new Date(now.getTime() + EMAIL_CODE_TTL_MS).toISOString(), nowIso);
}

export function verifyEmailVerification(email: string, code: unknown) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    throw new AuthError("Enter the six-digit confirmation code.");
  }
  const database = getDatabase();
  const now = new Date().toISOString();
  const challenge = database.prepare(`
    SELECT * FROM auth_email_challenges
    WHERE email = ? AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(email) as EmailChallengeRow | undefined;
  if (!challenge || challenge.expires_at <= now) {
    throw new AuthError("That confirmation code expired. Request a new one.");
  }
  if (challenge.attempts >= MAX_EMAIL_CODE_ATTEMPTS) {
    throw new AuthError("Too many incorrect codes. Request a new confirmation code.", 429);
  }

  const matches = safeEqual(challenge.code_hash, hash(code.trim()));
  if (!matches) {
    database.prepare("UPDATE auth_email_challenges SET attempts = attempts + 1 WHERE id = ?").run(challenge.id);
    throw new AuthError("That confirmation code is not correct.");
  }

  const createdAt = new Date().toISOString();
  database.prepare("UPDATE auth_email_challenges SET consumed_at = ? WHERE id = ?").run(createdAt, challenge.id);
  return createVerifiedEmailSession(email);
}

/** Creates an app session after an identity provider has verified the Cal Poly mailbox. */
export function createVerifiedEmailSession(email: string) {
  const database = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();
  const existingProfile = database.prepare(`
    SELECT id, phone, phone_verified_at FROM profiles WHERE email = ?
  `).get(email) as { id: string; phone: string; phone_verified_at: string | null } | undefined;
  const verifiedPhone = existingProfile?.phone_verified_at ? existingProfile.phone : null;
  database.prepare(`
    INSERT INTO auth_sessions (
      id, token_hash, email, email_verified_at, phone, phone_verified_at, profile_id, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    tokenHash(token),
    email,
    createdAt,
      verifiedPhone,
      verifiedPhone ? existingProfile?.phone_verified_at : null,
      existingProfile?.id ?? null,
    new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    createdAt,
    createdAt,
  );
  const session = database.prepare("SELECT * FROM auth_sessions WHERE id = ?").get(sessionId) as AuthSessionRow;
  return { token, session };
}

function twilioAuthorization() {
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  return {
    serviceSid: requiredEnv("TWILIO_VERIFY_SERVICE_SID"),
    authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
}

export async function startPhoneVerification(session: AuthSessionRow, phone: string) {
  const { serviceSid, authorization } = twilioAuthorization();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" }).toString(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AuthError("We could not send that text verification. Check the number or ask an IFC administrator for help.", 502);
  }
  getDatabase().prepare(`
    UPDATE auth_sessions SET phone = ?, phone_verified_at = NULL, updated_at = ? WHERE id = ?
  `).run(phone, new Date().toISOString(), session.id);
}

export async function verifyPhoneVerification(session: AuthSessionRow, phone: string, code: unknown) {
  if (typeof code !== "string" || code.trim().length < 4 || code.trim().length > 10) {
    throw new AuthError("Enter the code from your text message.");
  }
  const { serviceSid, authorization } = twilioAuthorization();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Code: code.trim() }).toString(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AuthError("That phone confirmation code is not correct or has expired.");
  }
  const result = await response.json().catch(() => null) as { status?: unknown } | null;
  if (result?.status !== "approved") throw new AuthError("That phone confirmation code is not correct or has expired.");
  const now = new Date().toISOString();
  getDatabase().prepare(`
    UPDATE auth_sessions SET phone = ?, phone_verified_at = ?, updated_at = ? WHERE id = ?
  `).run(phone, now, now, session.id);
}

export function linkSessionToProfile(session: AuthSessionRow, profileId: string) {
  getDatabase().prepare("UPDATE auth_sessions SET profile_id = ?, updated_at = ? WHERE id = ?")
    .run(profileId, new Date().toISOString(), session.id);
}

export function setAuthSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}

export function clearAuthSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (token) getDatabase().prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenHash(token));
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
