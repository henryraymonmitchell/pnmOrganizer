export const RUSH_PROGRESS_STAGES = [
  "open invite",
  "closed invite day 1",
  "closed invite day 2",
  "closed invite day 3",
  "bid night",
] as const;

export type RushProgressStage = (typeof RUSH_PROGRESS_STAGES)[number];

export type RushEventDto = {
  id: string;
  chapter_name: string;
  event_type: RushProgressStage;
  address: string;
  starts_at: string;
  ends_at: string;
  signed_up: boolean;
  signup_count: number;
};

export type PnmDirectoryDto = {
  id: string;
  full_name: string;
  hometown: string | null;
  major: string | null;
  photo_url: string | null;
  associated_houses: string[];
  progress: Record<string, RushProgressStage>;
};

export function isRushProgressStage(value: unknown): value is RushProgressStage {
  return typeof value === "string" && RUSH_PROGRESS_STAGES.some((stage) => stage === value);
}

export function allowedProgressUpdates(current: RushProgressStage | null): RushProgressStage[] {
  if (!current) return [RUSH_PROGRESS_STAGES[0], RUSH_PROGRESS_STAGES[1]];
  const currentIndex = RUSH_PROGRESS_STAGES.indexOf(current);
  return RUSH_PROGRESS_STAGES.slice(currentIndex, Math.min(currentIndex + 2, RUSH_PROGRESS_STAGES.length));
}

export function isRushEventDto(value: unknown): value is RushEventDto {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return typeof event.id === "string"
    && typeof event.chapter_name === "string"
    && isRushProgressStage(event.event_type)
    && typeof event.address === "string"
    && typeof event.starts_at === "string"
    && typeof event.ends_at === "string"
    && typeof event.signed_up === "boolean"
    && typeof event.signup_count === "number";
}

export function isRushEventList(value: unknown): value is RushEventDto[] {
  return Array.isArray(value) && value.every(isRushEventDto);
}

export function isPnmDirectoryList(value: unknown): value is PnmDirectoryDto[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const pnm = item as Record<string, unknown>;
    return typeof pnm.id === "string"
      && typeof pnm.full_name === "string"
      && (typeof pnm.hometown === "string" || pnm.hometown === null)
      && (typeof pnm.major === "string" || pnm.major === null)
      && (typeof pnm.photo_url === "string" || pnm.photo_url === null)
      && Array.isArray(pnm.associated_houses)
      && pnm.associated_houses.every((house) => typeof house === "string")
      && pnm.progress !== null
      && typeof pnm.progress === "object"
      && Object.entries(pnm.progress).every(([house, stage]) => typeof house === "string" && isRushProgressStage(stage));
  });
}
