"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type Pnm = { id: string; name: string; major: string; year: string; hometown: string; attended: string; tags: string[]; image: string };

const pnms: Pnm[] = [
  { id: "maya", name: "Maya Rodriguez", major: "Business", year: "2028", hometown: "San Diego, CA", attended: "Open House · Tonight", tags: ["Outgoing", "Leadership"], image: "" },
  { id: "theo", name: "Theo Nguyen", major: "Computer Science", year: "2027", hometown: "San Jose, CA", attended: "Open House · Tonight", tags: ["STEM", "Soccer"], image: "/pnms/pnm-theo.jpg" },
  { id: "julian", name: "Julian Brooks", major: "Political Science", year: "2028", hometown: "Long Beach, CA", attended: "Meet the Chapters", tags: ["Pre-law", "Greek legacy"], image: "/pnms/pnm-julian.jpg" },
  { id: "avery", name: "Avery Kim", major: "Architecture", year: "2027", hometown: "Irvine, CA", attended: "Open House · Tonight", tags: ["Design", "New"], image: "" }
];

export default function MemberPortal() {
  const [approval, setApproval] = useState<string | null>(null);
  const [chairSetting, setChairSetting] = useState<string | null>(null);
  const [screen, setScreen] = useState<"feed" | "schedule" | "chair" | "messages" | "profile">("feed");
  const [query, setQuery] = useState("");
  const [pnmList, setPnmList] = useState(pnms);
  const [addingPnm, setAddingPnm] = useState(false);
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  useEffect(() => { const params = new URLSearchParams(window.location.search); const chair = params.get("chair"); setApproval(params.get("approval")); setChairSetting(chair); if (chair === "yes" && params.get("approval") !== "pending") setScreen("chair"); }, []);
  useEffect(() => {
    let active = true;
    async function loadPnmDirectory() {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase.from("pnm_directory").select("id, full_name, hometown, major, photo_path").order("full_name");
      if (!active || error || !data) return;
      const directory = await Promise.all(data.map(async (pnm) => {
        const { data: signedPhoto } = pnm.photo_path
          ? await supabase.storage.from("profile-photos").createSignedUrl(pnm.photo_path, 60 * 60)
          : { data: null };
        return {
          id: pnm.id,
          name: pnm.full_name,
          major: pnm.major || "Not provided",
          year: "PNM",
          hometown: pnm.hometown || "Not provided",
          attended: "",
          tags: [],
          image: signedPhoto?.signedUrl || "",
        };
      }));
      if (active) setPnmList(directory);
    }
    void loadPnmDirectory();
    return () => { active = false; };
  }, []);
  const isRushChair = chairSetting === "yes";
  const filtered = useMemo(() => pnmList.filter((pnm) => `${pnm.name} ${pnm.major} ${pnm.year} ${pnm.hometown} ${pnm.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, pnmList]);
  const toggleInvite = (id: string) => setInviteList((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  const addNote = (id: string, note: string) => { if (!note.trim()) return; setNotes((current) => ({ ...current, [id]: [...(current[id] || []), note.trim()] })); };

  if (approval === "pending") return <ApprovalStatus chair={chairSetting === "yes"} />;
  return <main className="cal-poly-app member-app"><header className="cal-poly-header"><div className="brand brand-lockup"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></div><span className="role-label">{isRushChair ? "RUSH CHAIR HQ" : "MEMBER HQ"}</span><button className={isRushChair ? "avatar member-avatar chair-avatar" : "avatar member-avatar"} onClick={() => setScreen("profile")} aria-label="Open profile">{isRushChair ? <img src="/brand/rush-chair.jpg" alt="Rush chair profile" /> : "JM"}</button></header>
    {screen === "feed" && <PnmFeed isRushChair={isRushChair} query={query} setQuery={setQuery} pnms={filtered} inviteList={inviteList} toggleInvite={toggleInvite} notes={notes} addNote={addNote} messagePnm={() => setScreen("messages")} />}
    {screen === "schedule" && <RushSchedule />}
    {screen === "chair" && isRushChair && <ChairControlCenter inviteList={inviteList} goToPnms={() => setScreen("feed")} />}
    {screen === "messages" && <ChairMessages goBack={() => setScreen(isRushChair ? "chair" : "feed")} />}
    {screen === "profile" && <MemberProfile isRushChair={isRushChair} />}
    {addingPnm && <AddPnm close={() => setAddingPnm(false)} add={(pnm) => { setPnmList([pnm, ...pnmList]); setAddingPnm(false); setScreen("feed"); }} />}
    <nav className="bottom-nav member-nav"><button className={screen === "feed" ? "nav-active" : ""} onClick={() => setScreen("feed")}><span>⌂</span>PNMs</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>Schedule</button><button className="scan" aria-label="Add PNM" onClick={() => setAddingPnm(true)}><span>＋</span></button>{isRushChair ? <button className={screen === "chair" ? "nav-active" : ""} onClick={() => setScreen("chair")}><span>✦</span>Chair tools</button> : <button><span>♧</span>Reminders</button>}<button className={screen === "messages" ? "nav-active" : ""} onClick={() => setScreen("messages")}><span>✉</span>Messages</button></nav>
  </main>;
}

function ApprovalStatus({ chair }: { chair: boolean }) { const enterWorkspace = () => window.location.assign(`/member?chair=${chair ? "yes" : "no"}`); return <main className="cal-poly-app member-pending"><section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER PROFILE</p></section><section className="gateway-card"><p className="eyebrow">REQUEST SUBMITTED</p><span className="verified-mark pending">◷</span><h1>Waiting for<br />approval.</h1><p className="gateway-copy">Your active-member profile is with your chapter’s rush chair. You’ll receive member access once they confirm you.</p><section className="approval-detail"><strong>{chair ? "Rush chair profile noted" : "Active member profile noted"}</strong><span>Cal Poly email verified</span></section><section className="demo-bypass"><p>DEMO MODE</p><strong>{chair ? "Skip chair verification" : "Skip member approval"}</strong><span>For prototype review only. This will be removed when real approvals are connected.</span><button onClick={enterWorkspace}>Enter {chair ? "rush chair" : "member"} workspace →</button></section></section></main>; }

function MemberProfile({ isRushChair }: { isRushChair: boolean }) { return <div className="shell member-profile"><p className="eyebrow">{isRushChair ? "RUSH CHAIR PROFILE" : "ACTIVE MEMBER PROFILE"}</p>{isRushChair ? <><img className="chair-profile-photo" src="/brand/rush-chair.jpg" alt="Rush chair profile" /><h1>Miles Schulist</h1><p className="muted">Rush Chair · Delta Upsilon</p><section className="profile-detail"><strong>Available to PNMs</strong><span>Questions from PNMs will appear in your private messages.</span></section></> : <><div className="profile-placeholder member-profile-placeholder" /><h1>Active member</h1><p className="muted">Your profile details will be available here.</p></>}</div>; }

function PnmFeed({ isRushChair, query, setQuery, pnms: visiblePnms, inviteList, toggleInvite, notes, addNote, messagePnm }: { isRushChair: boolean; query: string; setQuery: (value: string) => void; pnms: Pnm[]; inviteList: string[]; toggleInvite: (id: string) => void; notes: Record<string, string[]>; addNote: (id: string, note: string) => void; messagePnm: () => void }) { return <div className="shell member-feed"><section className="member-hero"><p className="eyebrow">DELTA TAU DELTA · RUSH</p><h1>{isRushChair ? "View your\nPNMs." : "PNM profiles."}</h1></section><section className="reminder-card"><span>◷</span><div><strong>Rush schedule reminder</strong><p>Open House begins at 7:00 PM.</p></div><button>Set</button></section><div className="feed-search discreet"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PNMs" /></div><section className="feed-label"><div><p className="eyebrow">PNM DIRECTORY</p><h2>{visiblePnms.length} profiles</h2></div>{isRushChair && <span>{inviteList.length} selected</span>}</section><section className="pnm-feed-list">{visiblePnms.map((pnm) => <PnmCard key={pnm.id} pnm={pnm} isRushChair={isRushChair} invited={inviteList.includes(pnm.id)} toggleInvite={toggleInvite} notes={notes[pnm.id] || []} addNote={addNote} messagePnm={messagePnm} />)}</section></div>; }

function PnmCard({ pnm, isRushChair, invited, toggleInvite, notes, addNote, messagePnm }: { pnm: Pnm; isRushChair: boolean; invited: boolean; toggleInvite: (id: string) => void; notes: string[]; addNote: (id: string, note: string) => void; messagePnm: () => void }) { const [draft, setDraft] = useState(""); return <article className="pnm-card compact">{pnm.image ? <img className="profile-placeholder pnm-photo" src={pnm.image} alt={`${pnm.name} profile`} /> : <div className="profile-placeholder" aria-label="Default profile photo"></div>}<div className="pnm-card-body"><h2>{pnm.name}</h2><p className="pnm-detail">{pnm.hometown}<br />{pnm.major} · {pnm.year}</p><div className="pnm-actions"><button onClick={messagePnm}>Message PNM</button>{isRushChair && <button className={invited ? "invite-toggle selected" : "invite-toggle"} onClick={() => toggleInvite(pnm.id)}>{invited ? "✓ Invite list" : "+ Invite list"}</button>}</div><section className="notes"><p>Private discussion notes <span>{notes.length}</span></p>{notes.map((note, index) => <blockquote key={`${note}-${index}`}>{note}</blockquote>)}<div><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add note for actives & chair…" onKeyDown={(event) => { if (event.key === "Enter") { addNote(pnm.id, draft); setDraft(""); } }} /><button onClick={() => { addNote(pnm.id, draft); setDraft(""); }}>Add</button></div></section></div></article>; }

function RushSchedule() { return <div className="shell rush-schedule"><section className="greeting"><p className="eyebrow">DELTA TAU DELTA · RUSH WEEK</p><h1>Keep the room<br />moving.</h1><p className="muted">Your chapter’s events and member reminders.</p></section><button className="schedule-event">＋ Schedule an event</button><section className="member-events"><article><span>SEP<br /><b>10</b></span><div><p>TONIGHT · 7:00 PM</p><h3>Open House</h3><small>405 College Ave · 42 checked in</small></div><button>•••</button></article><article><span>SEP<br /><b>12</b></span><div><p>FRIDAY · 5:30 PM</p><h3>Patio Social</h3><small>405 College Ave · RSVP follow-up</small></div><button>•••</button></article></section><section className="reminder-settings"><span>♧</span><div><strong>Member reminders</strong><p>Get notified 30 minutes before each event.</p></div><button className="toggle-on">●</button></section></div>; }

function ChairControlCenter({ inviteList, goToPnms }: { inviteList: string[]; goToPnms: () => void }) { const [view, setView] = useState<"home" | "invites" | "messages">("home"); const [custom, setCustom] = useState("Hey! We loved meeting you at Open House. We’d love to see you at our next event."); const [confirm, setConfirm] = useState(false); const [sent, setSent] = useState(false); if (view === "invites") return <div className="shell chair-center"><button className="back-button" onClick={() => setView("home")}>← Rush chair tools</button><p className="eyebrow">ROUND 1 INVITATIONS</p><h1>Review before<br />you send.</h1><p className="muted">{inviteList.length || "No"} PNM{inviteList.length === 1 ? "" : "s"} selected from the feed.</p><label className="message-template">Invitation text<textarea value={custom} onChange={(event) => setCustom(event.target.value)} /></label>{!confirm ? <button className="gateway-next" disabled={!inviteList.length} onClick={() => setConfirm(true)}>Review send →</button> : !sent ? <section className="send-confirm"><strong>Send to {inviteList.length} PNM{inviteList.length === 1 ? "" : "s"}?</strong><p>This will send the text and add the event to each PNM’s schedule. This can’t be undone.</p><button className="gateway-next" onClick={() => setSent(true)}>Yes, send invitations</button><button onClick={() => setConfirm(false)}>Go back</button></section> : <section className="message-sent full-page"><span>✓</span><h2>Invitations sent</h2><p>Delivery status will appear here as messages are sent.</p></section>}</div>; if (view === "messages") return <ChairMessages goBack={() => setView("home")} />; return <div className="shell chair-center"><section className="chair-hero"><p className="eyebrow">RUSH CHAIR HQ</p><h1>Lead the<br /><em>next round.</em></h1><p>Choose what you want to manage first.</p></section><section className="chair-actions"><button><span>＋</span><strong>Create an event</strong><small>Set a round, time, and location</small><b>→</b></button><button onClick={goToPnms}><span>◫</span><strong>View PNMs</strong><small>Search profiles and add to invite list</small><b>→</b></button><button onClick={() => setView("invites")}><span>✦</span><strong>Send invites</strong><small>{inviteList.length} PNMs waiting for review</small><b>→</b></button></section></div>; }

function ChairMessages({ goBack }: { goBack: () => void }) { const [reply, setReply] = useState(""); const [replies, setReplies] = useState<string[]>([]); return <div className="shell chair-messages"><button className="back-button" onClick={goBack}>← Rush chair tools</button><p className="eyebrow">PRIVATE PNM MESSAGES</p><h1>Stay in the<br />conversation.</h1><section className="conversation"><header><span>MR</span><div><strong>Maya Rodriguez</strong><small>Asked 14m ago</small></div></header><div className="incoming">Hi! Is there a dress code for Friday’s patio social?</div>{replies.map((message) => <div className="outgoing" key={message}>{message}</div>)}<div className="reply-box"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a private reply…" /><button onClick={() => { if (reply.trim()) { setReplies([...replies, reply]); setReply(""); } }}>Send</button></div></section></div>; }

function AddPnm({ close, add }: { close: () => void; add: (pnm: Pnm) => void }) { const [name, setName] = useState(""); const [major, setMajor] = useState(""); return <div className="member-modal"><section><button className="sheet-close" onClick={close}>×</button><p className="eyebrow">ADD PNM</p><h2>New attendee</h2><p>Add someone you met at the door or through a manual sign-in.</p><label>Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" /></label><label>Major <span>(optional)</span><input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Business" /></label><button className="gateway-next" disabled={!name.trim()} onClick={() => add({ id: `manual-${Date.now()}`, name: name.trim(), major: major || "Not provided", year: "PNM", hometown: "Added manually", attended: "Manual check-in", tags: ["New"], image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85" })}>Add to PNM feed</button></section></div>; }
