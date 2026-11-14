"use client";

import { useEffect, useState } from "react";

export default function ChapterMessagePage() {
  const [chapter, setChapter] = useState("This chapter");
  const [mark, setMark] = useState("IFC");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; mine: boolean }[]>([]);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const currentChapter = params.get("chapter") || "This chapter"; setChapter(currentChapter); setMark(params.get("mark") || "IFC"); setMessages([{ text: `Hi! You’re connected with the ${currentChapter} rush chairs. What can we help with?`, mine: false }]); }, []);
  const send = () => { if (!message.trim()) return; setMessages((current) => [...current, { text: message.trim(), mine: true }]); setMessage(""); };
  return <main className="cal-poly-app message-page"><header className="cal-poly-header"><button className="message-back" onClick={() => window.history.back()}>← Chats</button><span className="role-label">PRIVATE CHAT</span><div className="message-header-mark">{mark}</div></header><section className="message-page-body chat-page"><div className="chat-contact"><span className="chapter-monogram message-page-mark">{mark}</span><div><strong>{chapter} rush chairs</strong><small>Private chapter chat</small></div></div><section className="chat-thread" aria-label={`Chat with ${chapter} rush chairs`}>{messages.map((item, index) => <p key={`${item.text}-${index}`} className={item.mine ? "chat-bubble mine" : "chat-bubble"}>{item.text}</p>)}</section><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); send(); }}><input autoFocus value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message rush chairs" /><button type="submit" aria-label="Send message"><span className="plane-icon">➤</span></button></form><p className="message-safety">Be respectful and don’t share sensitive personal information.</p></section></main>;
}
