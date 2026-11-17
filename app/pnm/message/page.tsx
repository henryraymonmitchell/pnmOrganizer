"use client";

import { useCallback, useEffect, useState } from "react";
import { isChapterMessageList, type ChapterMessageDto } from "@/lib/message-domain";

function apiError(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

export default function ChapterMessagePage() {
  const [chapter, setChapter] = useState("This chapter");
  const [mark, setMark] = useState("IFC");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChapterMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setChapter(params.get("chapter") || "This chapter");
    setMark(params.get("mark") || "IFC");
  }, []);

  const loadMessages = useCallback(async (quiet = false) => {
    if (chapter === "This chapter") return;
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/messages?chapter=${encodeURIComponent(chapter)}`, { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok || !isChapterMessageList(result)) throw new Error(apiError(result, "Could not load this conversation."));
      setMessages(result);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this conversation.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [chapter]);

  useEffect(() => {
    void loadMessages();
    const refresh = window.setInterval(() => void loadMessages(true), 5000);
    return () => window.clearInterval(refresh);
  }, [loadMessages]);

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_name: chapter, body: text }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !("id" in result)) {
        throw new Error(apiError(result, "Could not send your message."));
      }
      setMessage("");
      await loadMessages(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  return <main className="cal-poly-app message-page"><header className="cal-poly-header"><button className="message-back" onClick={() => window.location.assign("/pnm?screen=messages")}>← Chats</button><span className="role-label">PRIVATE CHAT</span><div className="message-header-mark">{mark}</div></header><section className="message-page-body chat-page"><div className="chat-contact"><span className="chapter-monogram message-page-mark">{mark}</span><div><strong>{chapter} rush chairs</strong><small>Private chapter chat</small></div></div><section className="chat-thread" aria-label={`Chat with ${chapter} rush chairs`}>{loading ? <p className="chat-empty">Loading conversation…</p> : messages.length ? messages.map((item) => <p key={item.id} className={item.mine ? "chat-bubble mine" : "chat-bubble"}>{item.body}</p>) : <p className="chat-empty">Start the conversation with this chapter’s rush chairs.</p>}</section>{error && <p className="chat-error" role="alert">{error}</p>}<form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><input autoFocus value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1500} placeholder="Message rush chairs" /><button type="submit" disabled={!message.trim() || sending} aria-label="Send message"><span className="plane-icon">➤</span></button></form><p className="message-safety">Be respectful and don’t share sensitive personal information.</p></section></main>;
}
