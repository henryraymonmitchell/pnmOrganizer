import type { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getProfileById } from "@/lib/server/profiles";

export const PROFILE_COOKIE = "rush_profile_id";

export function getRequestProfile(request: NextRequest) {
  const authenticatedId = getAuthSession(request)?.profile_id;
  if (authenticatedId) return getProfileById(authenticatedId);
  // Keep existing local prototype records reachable until their owner signs in
  // through the new verification flow. Newly created profiles are session-bound.
  const id = request.cookies.get(PROFILE_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getProfileById(id);
}
