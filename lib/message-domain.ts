export type ChapterMessageDto = {
  id: string;
  chapter_name: string;
  pnm_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  mine: boolean;
};

export type ChapterConversationDto = {
  pnm_id: string;
  full_name: string;
  photo_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export function isChapterMessageList(value: unknown): value is ChapterMessageDto[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const message = item as Record<string, unknown>;
    return typeof message.id === "string"
      && typeof message.chapter_name === "string"
      && typeof message.pnm_id === "string"
      && typeof message.sender_profile_id === "string"
      && typeof message.body === "string"
      && typeof message.created_at === "string"
      && typeof message.mine === "boolean";
  });
}

export function isChapterConversationList(value: unknown): value is ChapterConversationDto[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const conversation = item as Record<string, unknown>;
    return typeof conversation.pnm_id === "string"
      && typeof conversation.full_name === "string"
      && (typeof conversation.photo_url === "string" || conversation.photo_url === null)
      && typeof conversation.last_message === "string"
      && typeof conversation.last_message_at === "string"
      && typeof conversation.unread_count === "number";
  });
}
