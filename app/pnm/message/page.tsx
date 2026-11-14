"use client";

import { useEffect, useState } from "react";

export default function ChapterMessagePage() {
  const [chapter, setChapter] = useState("This chapter");
  const [mark, setMark] = useState("IFC");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); setChapter(params.get("chapter") || "This chapter"); setMark(params.get("mark") || "IFC"); }, []);
  return <main className="cal-poly-app message-page"><header className="cal-poly-header"><button className="message-back" onClick={() => window.history.back()}>← Back</button><span className="role-label">PRIVATE MESSAGE</span><div className="message-header-mark">{mark}</div></header><section className="message-page-body">{sent ? <div className="message-sent full-page"><span>✓</span><p className="eyebrow">MESSAGE SENT</p><h1>Your question is<br />on its way.</h1><p>The {chapter} rush chairs will receive your private question in their chapter workspace.</p><button className="gateway-next" onClick={() => window.history.back()}>Back to chapter</button></div> : <><span className="chapter-monogram message-page-mark">{mark}</span><p className="eyebrow">TO {chapter.toUpperCase()} RUSH CHAIRS</p><h1>Ask a question.</h1><p className="message-intro">Your message is private. Only this chapter’s rush chairs can see and reply to it.</p><label>Your message<textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What would you like to know?" /></label><button className="gateway-next" disabled={!message.trim()} onClick={() => setSent(true)}>Send private message →</button><p className="message-safety">Be respectful and don’t share sensitive personal information.</p></>}</section></main>;
}
