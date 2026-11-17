export type AuthSessionDto = {
  email: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  profile_id: string | null;
};

export function isAuthSessionDto(value: unknown): value is AuthSessionDto {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return typeof session.email === "string"
    && typeof session.email_verified === "boolean"
    && (typeof session.phone === "string" || session.phone === null)
    && typeof session.phone_verified === "boolean"
    && (typeof session.profile_id === "string" || session.profile_id === null);
}
