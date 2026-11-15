export const PROFILE_ROLES = ["IFC Admin", "Rush Chair", "Active Member", "PNM"] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const FUNNY_QUESTION_PROMPT = "What's one thing people are surprised to learn about you?";

export type ProfileDto = {
  id: string;
  role: ProfileRole;
  full_name: string;
  hometown: string | null;
  major: string | null;
  associated_houses: string[];
  funny_question_answer: string | null;
  phone: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export function isProfileDto(value: unknown): value is ProfileDto {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === "string"
    && PROFILE_ROLES.some((role) => role === profile.role)
    && typeof profile.full_name === "string"
    && (typeof profile.hometown === "string" || profile.hometown === null)
    && (typeof profile.major === "string" || profile.major === null)
    && Array.isArray(profile.associated_houses)
    && profile.associated_houses.every((house) => typeof house === "string")
    && (typeof profile.funny_question_answer === "string" || profile.funny_question_answer === null)
    && typeof profile.phone === "string"
    && (typeof profile.photo_url === "string" || profile.photo_url === null)
    && typeof profile.created_at === "string"
    && typeof profile.updated_at === "string";
}
