import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify as verifySignature } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, createVerifiedEmailSession, getAuthCodeSecret, normalizeCalPolyEmail, setAuthSessionCookie } from "@/lib/server/auth";

const MICROSOFT_STATE_COOKIE = "rush_microsoft_state";
const STATE_TTL_MS = 10 * 60 * 1000;
const ALLOWED_ROLES = new Set(["PNM", "Active Member", "Rush Chair", "IFC Admin"]);

type PendingMicrosoftLogin = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
};

type MicrosoftConfig = {
  clientId: string;
  clientSecret: string;
  tenant: string;
};

type OpenIdConfiguration = {
  issuer: string;
  jwks_uri: string;
};

type TokenClaims = Record<string, unknown>;

function requiredMicrosoftEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AuthError("Microsoft sign-in is not configured yet. Ask an IFC administrator to finish the Cal Poly Microsoft 365 setup.", 503);
  }
  return value;
}

function microsoftConfig(): MicrosoftConfig {
  const tenant = (process.env.MICROSOFT_TENANT_ID?.trim() || "organizations").toLowerCase();
  if (!/^[a-z0-9.-]+$/i.test(tenant)) throw new AuthError("Microsoft sign-in tenant configuration is invalid.", 503);
  return {
    clientId: requiredMicrosoftEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: requiredMicrosoftEnv("MICROSOFT_CLIENT_SECRET"),
    tenant,
  };
}

function applicationOrigin(request: NextRequest) {
  const configured = process.env.AUTH_APP_URL?.trim();
  if (!configured) return request.nextUrl.origin;
  try {
    return new URL(configured).origin;
  } catch {
    throw new AuthError("The Rush app URL configuration is invalid.", 503);
  }
}

function redirectUri(request: NextRequest) {
  const configured = process.env.MICROSOFT_REDIRECT_URI?.trim();
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      throw new AuthError("The Microsoft redirect URL configuration is invalid.", 503);
    }
  }
  return new URL("/api/auth/microsoft/callback", applicationOrigin(request)).toString();
}

function sanitizeReturnTo(value: string | null) {
  if (!value?.startsWith("/")) return "/";
  try {
    const parsed = new URL(value, "https://rush.local");
    if (parsed.origin !== "https://rush.local" || parsed.pathname !== "/") return "/";
    const params = new URLSearchParams();
    const role = parsed.searchParams.get("role");
    if (role && ALLOWED_ROLES.has(role)) params.set("role", role);
    if (parsed.searchParams.get("switch") === "1") params.set("switch", "1");
    const query = params.toString();
    return query ? `/?${query}` : "/";
  } catch {
    return "/";
  }
}

function signedPendingLogin(pending: PendingMicrosoftLogin) {
  const payload = Buffer.from(JSON.stringify(pending)).toString("base64url");
  const signature = createHmac("sha256", getAuthCodeSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parsePendingLogin(value: string | undefined) {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", getAuthCodeSecret()).update(payload).digest("base64url");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<PendingMicrosoftLogin>;
    if (
      typeof candidate.state !== "string" ||
      typeof candidate.nonce !== "string" ||
      typeof candidate.verifier !== "string" ||
      typeof candidate.returnTo !== "string" ||
      typeof candidate.expiresAt !== "number" ||
      candidate.expiresAt < Date.now()
    ) return null;
    return candidate as PendingMicrosoftLogin;
  } catch {
    return null;
  }
}

function setPendingLoginCookie(response: NextResponse, pending: PendingMicrosoftLogin) {
  response.cookies.set(MICROSOFT_STATE_COOKIE, signedPendingLogin(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(STATE_TTL_MS / 1000),
  });
  return response;
}

function clearPendingLoginCookie(response: NextResponse) {
  response.cookies.set(MICROSOFT_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

function redirectToGateway(request: NextRequest, returnTo: string, error?: string) {
  const destination = new URL(returnTo, applicationOrigin(request));
  if (error) destination.searchParams.set("auth_error", error);
  return NextResponse.redirect(destination);
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function getOpenIdConfiguration(tenant: string) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`, {
    cache: "no-store",
  });
  if (!response.ok) throw new AuthError("Microsoft sign-in could not be reached. Please try again.", 502);
  const configuration = await response.json().catch(() => null) as Partial<OpenIdConfiguration> | null;
  if (!configuration?.issuer || !configuration.jwks_uri) throw new AuthError("Microsoft sign-in returned an invalid configuration.", 502);
  return configuration as OpenIdConfiguration;
}

async function verifyIdToken(idToken: string, config: MicrosoftConfig, expectedNonce: string) {
  const [headerPart, payloadPart, signaturePart, extra] = idToken.split(".");
  if (!headerPart || !payloadPart || !signaturePart || extra) throw new AuthError("Microsoft returned an invalid sign-in token.", 401);
  const header = decodeJson(headerPart);
  const claims = decodeJson(payloadPart) as TokenClaims | null;
  if (header?.alg !== "RS256" || typeof header.kid !== "string" || !claims) {
    throw new AuthError("Microsoft returned an invalid sign-in token.", 401);
  }

  const metadata = await getOpenIdConfiguration(config.tenant);
  const jwksResponse = await fetch(metadata.jwks_uri, { cache: "no-store" });
  const jwks = await jwksResponse.json().catch(() => null) as { keys?: Array<Record<string, unknown>> } | null;
  const jwk = jwks?.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!jwk) throw new AuthError("Microsoft sign-in token could not be verified. Please try again.", 401);

  let publicKey;
  try {
    publicKey = createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    throw new AuthError("Microsoft sign-in token could not be verified. Please try again.", 401);
  }
  const validSignature = verifySignature("RSA-SHA256", Buffer.from(`${headerPart}.${payloadPart}`), publicKey, Buffer.from(signaturePart, "base64url"));
  if (!validSignature) throw new AuthError("Microsoft sign-in token could not be verified. Please try again.", 401);

  const tenantId = typeof claims.tid === "string" ? claims.tid : "";
  const expectedIssuer = metadata.issuer.replace("{tenantid}", tenantId);
  const audience = claims.aud;
  const hasAudience = audience === config.clientId || (Array.isArray(audience) && audience.includes(config.clientId));
  const now = Math.floor(Date.now() / 1000);
  if (
    !tenantId ||
    claims.iss !== expectedIssuer ||
    !hasAudience ||
    claims.nonce !== expectedNonce ||
    typeof claims.exp !== "number" ||
    claims.exp <= now - 60 ||
    (typeof claims.nbf === "number" && claims.nbf > now + 60)
  ) {
    throw new AuthError("Microsoft sign-in token was not valid for this request. Please try again.", 401);
  }
  return claims;
}

async function exchangeCodeForEmail(request: NextRequest, code: string, pending: PendingMicrosoftLogin) {
  const config = microsoftConfig();
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(request),
      code_verifier: pending.verifier,
    }).toString(),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { id_token?: unknown } | null;
  if (!response.ok || typeof result?.id_token !== "string") {
    throw new AuthError("Microsoft could not complete that sign-in. Please try again.", 401);
  }
  const claims = await verifyIdToken(result.id_token, config, pending.nonce);
  const email = [claims.email, claims.preferred_username, claims.upn].find((value): value is string => typeof value === "string");
  return normalizeCalPolyEmail(email);
}

export function startMicrosoftLogin(request: NextRequest) {
  const config = microsoftConfig();
  getAuthCodeSecret();
  const pending: PendingMicrosoftLogin = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    returnTo: sanitizeReturnTo(request.nextUrl.searchParams.get("next")),
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const authorizeUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/authorize`);
  authorizeUrl.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri(request),
    response_mode: "query",
    scope: "openid profile email",
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: createHash("sha256").update(pending.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return setPendingLoginCookie(NextResponse.redirect(authorizeUrl), pending);
}

export async function finishMicrosoftLogin(request: NextRequest) {
  let pending: PendingMicrosoftLogin | null = null;
  let returnTo = "/";
  try {
    pending = parsePendingLogin(request.cookies.get(MICROSOFT_STATE_COOKIE)?.value);
    returnTo = pending?.returnTo ?? "/";
    const providerError = request.nextUrl.searchParams.get("error");
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    if (providerError) throw new AuthError("Microsoft sign-in was cancelled or did not complete.", 401);
    if (!pending || !state || state !== pending.state || !code) {
      throw new AuthError("Your Microsoft sign-in session expired. Please start again.", 401);
    }
    const email = await exchangeCodeForEmail(request, code, pending);
    const { token } = createVerifiedEmailSession(email);
    const response = setAuthSessionCookie(redirectToGateway(request, returnTo), token);
    return clearPendingLoginCookie(response);
  } catch (error) {
    const message = error instanceof AuthError ? error.message : "Microsoft sign-in could not be completed. Please try again.";
    return clearPendingLoginCookie(redirectToGateway(request, returnTo, message));
  }
}
