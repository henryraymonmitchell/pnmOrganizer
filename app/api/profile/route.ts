import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { chapterNames } from "@/lib/chapters";
import { PROFILE_ROLES, type ProfileDto, type ProfileRole } from "@/lib/profile-domain";
import { AuthError, clearAuthSession, getAuthSession, linkSessionToProfile, requireVerifiedIdentitySession } from "@/lib/server/auth";
import { getProfileByEmail, getProfileById, saveProfile, type ProfileInput, type StoredProfile } from "@/lib/server/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_COOKIE = "rush_profile_id";
const PHOTO_DIRECTORY = resolve("data/profile-photos");
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const validHouseNames = new Set(chapterNames);

class ProfileValidationError extends Error {}

function profileDto(profile: StoredProfile): ProfileDto {
  return {
    id: profile.id,
    role: profile.role,
    full_name: profile.full_name,
  email: profile.email,
  email_verified_at: profile.email_verified_at,
    hometown: profile.hometown,
    major: profile.major,
    associated_houses: profile.associated_houses,
    funny_question_answer: profile.funny_question_answer,
    phone: profile.phone,
  phone_verified_at: profile.phone_verified_at,
    photo_url: profile.photo_path ? "/api/profile/photo" : null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function getCurrentId(request: NextRequest) {
  const id = request.cookies.get(PROFILE_COOKIE)?.value;
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function parseHouses(value: FormDataEntryValue | null, role: ProfileRole) {
  if (role === "IFC Admin") return chapterNames;
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : [];
  } catch {
    throw new ProfileValidationError("Associated houses must be a list.");
  }
  if (!Array.isArray(parsed) || !parsed.every((house) => typeof house === "string")) {
    throw new ProfileValidationError("Associated houses must be a list of chapter names.");
  }

  const houses = Array.from(new Set(parsed.map((house: string) => house.trim())));
  if (houses.some((house) => !validHouseNames.has(house))) {
    throw new ProfileValidationError("Choose houses from the recognized chapter list.");
  }
  if ((role === "Rush Chair" || role === "Active Member") && houses.length !== 1) {
    throw new ProfileValidationError(`${role} profiles must select exactly one chapter.`);
  }
  return houses;
}

type VerifiedIdentity = {
  email: string;
  email_verified_at: string;
  phone: string;
  phone_verified_at: string;
};

async function parseProfile(request: NextRequest, id: string, prior: StoredProfile | null, identity: VerifiedIdentity) {
  const form = await request.formData();
  const roleValue = form.get("role");
  const role = PROFILE_ROLES.find((candidate) => candidate === roleValue);
  const fullName = optionalText(form.get("full_name"));
  const submittedPhone = optionalText(form.get("phone"));

  if (!role) throw new ProfileValidationError("Choose a valid profile role.");
  if (!fullName || fullName.length < 2) throw new ProfileValidationError("Enter your full name.");
  if (submittedPhone && !PHONE_PATTERN.test(submittedPhone)) {
    throw new ProfileValidationError("Enter a phone number in international format, such as +13428765643.");
  }
  if (submittedPhone && submittedPhone !== identity.phone) {
    throw new ProfileValidationError("Use the phone number you just verified.");
  }

  const photo = form.get("photo");
  let photoPath = prior?.photo_path ?? null;
  if (photo && typeof photo !== "string" && photo.size > 0) {
    const extensionByType: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const extension = extensionByType[photo.type];
    if (!extension) throw new ProfileValidationError("Use a JPG, PNG, or WebP photo.");
    if (photo.size > 5 * 1024 * 1024) throw new ProfileValidationError("Choose a photo smaller than 5 MB.");

    await mkdir(PHOTO_DIRECTORY, { recursive: true });
    const fileName = `${id}${extension}`;
    await writeFile(join(PHOTO_DIRECTORY, fileName), Buffer.from(await photo.arrayBuffer()));
    photoPath = `data/profile-photos/${fileName}`;
  }
  if (!photoPath) throw new ProfileValidationError("Add a profile photo.");

  return {
    id,
    role,
    full_name: fullName,
    email: identity.email,
    email_verified_at: identity.email_verified_at,
    hometown: optionalText(form.get("hometown")),
    major: optionalText(form.get("major")),
    funny_question_answer: optionalText(form.get("funny_question_answer")),
    phone: identity.phone,
    phone_verified_at: identity.phone_verified_at,
    photo_path: photoPath,
    associated_houses: parseHouses(form.get("associated_houses"), role),
    created_at: prior?.created_at,
  } satisfies ProfileInput;
}

function withProfileCookie(response: NextResponse, id: string) {
  response.cookies.set(PROFILE_COOKIE, id, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const session = getAuthSession(request);
    const id = session?.profile_id ?? getCurrentId(request);
    if (!id) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const profile = getProfileById(id);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    return NextResponse.json(profileDto(profile));
  } catch {
    return NextResponse.json({ error: "Could not load the profile." }, { status: 500 });
  }
}

async function saveFromRequest(request: NextRequest, requireExisting: boolean) {
  try {
    const session = requireVerifiedIdentitySession(request);
    const cookieId = getCurrentId(request);
    const profileFromSession = session.profile_id ? getProfileById(session.profile_id) : null;
    const profileFromCookie = cookieId ? getProfileById(cookieId) : null;
    const prior = profileFromSession ?? profileFromCookie;
    if (requireExisting && !prior) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const profileForEmail = getProfileByEmail(session.email);
    if (profileForEmail && prior && profileForEmail.id !== prior.id) {
      return NextResponse.json({ error: "That Cal Poly email is already linked to another profile." }, { status: 409 });
    }
    if (profileForEmail && !prior) {
      return NextResponse.json({ error: "That Cal Poly email already has a profile. Return to the sign-in page to open it." }, { status: 409 });
    }

    const id = prior?.id ?? randomUUID();
    const input = await parseProfile(request, id, prior, {
      email: session.email,
      email_verified_at: session.email_verified_at,
      phone: session.phone!,
      phone_verified_at: session.phone_verified_at!,
    });
    const profile = saveProfile(input, input.role === "PNM" ? input.id : null);
    linkSessionToProfile(session, id);
    return withProfileCookie(NextResponse.json(profileDto(profile), { status: prior ? 200 : 201 }), id);
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not save the profile." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return saveFromRequest(request, false);
}

export async function PATCH(request: NextRequest) {
  return saveFromRequest(request, true);
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ signed_out: true });
  response.cookies.set(PROFILE_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return clearAuthSession(request, response);
}
