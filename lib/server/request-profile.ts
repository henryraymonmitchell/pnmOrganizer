import type { NextRequest } from "next/server";
import { getProfileById } from "@/lib/server/profiles";

export const PROFILE_COOKIE = "rush_profile_id";

export function getRequestProfile(request: NextRequest) {
  const id = request.cookies.get(PROFILE_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getProfileById(id);
}
