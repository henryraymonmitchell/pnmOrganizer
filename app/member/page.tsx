"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { isProfileDto, type ProfileDto, type ProfileRole } from "@/lib/profile-domain";
import { chapters, type Chapter } from "@/lib/chapters";

type Pnm = { id: string; name: string; major: string; year: string; hometown: string; attended: string; tags: string[]; image: string };
type ChapterScheduleEvent = { date: string; day: string; title: string; time: string; note: string };

const searchableText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .trim();

const pnms: Pnm[] = [
  { id: "maya", name: "Maya Rodriguez", major: "Business", year: "2028", hometown: "San Diego, CA", attended: "Open House · Tonight", tags: ["Outgoing", "Leadership"], image: "" },
  { id: "theo", name: "Theo Nguyen", major: "Computer Science", year: "2027", hometown: "San Jose, CA", attended: "Open House · Tonight", tags: ["STEM", "Soccer"], image: "/pnms/pnm-theo.jpg" },
  { id: "julian", name: "Julian Brooks", major: "Political Science", year: "2028", hometown: "Long Beach, CA", attended: "Meet the Chapters", tags: ["Pre-law", "Greek legacy"], image: "/pnms/pnm-julian.jpg" },
  { id: "avery", name: "Avery Kim", major: "Architecture", year: "2027", hometown: "Irvine, CA", attended: "Open House · Tonight", tags: ["Design", "New"], image: "" }
];

export default function MemberPortal() {
  const [approval, setApproval] = useState<string | null>(null);
  const [chairSetting, setChairSetting] = useState<string | null>(null);
  const [roleSetting, setRoleSetting] = useState<ProfileRole | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileDto | null>(null);
  const [screen, setScreen] = useState<"feed" | "schedule" | "chair" | "messages" | "profile">("feed");
  const [query, setQuery] = useState("");
  const [pnmList, setPnmList] = useState(pnms);
  const [addingPnm, setAddingPnm] = useState(false);
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chair = params.get("chair");
    const routeRole = params.get("role");
    setApproval(params.get("approval"));
    setChairSetting(chair);
    setRoleSetting(routeRole === "IFC Admin" || routeRole === "Rush Chair" || routeRole === "Active Member" ? routeRole : null);
    if (chair === "yes" && params.get("approval") !== "pending") setScreen("chair");
  }, []);
  useEffect(() => {
    let active = true;
    async function loadOwnProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (active && isProfileDto(value)) setMyProfile(value);
      } catch {
        // The workspace can still show its demo data without a saved profile.
      }
    }
    void loadOwnProfile();
    return () => { active = false; };
  }, []);
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
  const isRushChair = myProfile?.role === "Rush Chair" || roleSetting === "Rush Chair" || chairSetting === "yes";
  const currentRole = myProfile?.role ?? roleSetting ?? (isRushChair ? "Rush Chair" : "Active Member");
  const memberChapter = myProfile?.associated_houses[0]
    ? chapters.find((chapter) => chapter.name === myProfile.associated_houses[0]) ?? null
    : null;
  const filtered = useMemo(() => {
    const searchTerms = searchableText(query).split(/\s+/).filter(Boolean);
    if (!searchTerms.length) return pnmList;
    return pnmList.filter((pnm) => {
      const profileText = searchableText(`${pnm.name} ${pnm.major} ${pnm.year} ${pnm.hometown} ${pnm.tags.join(" ")}`);
      return searchTerms.every((term) => profileText.includes(term));
    });
  }, [query, pnmList]);
  const toggleInvite = (id: string) => setInviteList((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  const addNote = (id: string, note: string) => { if (!note.trim()) return; setNotes((current) => ({ ...current, [id]: [...(current[id] || []), note.trim()] })); };
  const saveProfileDetails = async (details: Pick<ProfileDto, "hometown" | "major">) => {
    if (!myProfile) return false;
    const form = new FormData();
    form.set("role", myProfile.role);
    form.set("full_name", myProfile.full_name);
    form.set("phone", myProfile.phone);
    form.set("hometown", details.hometown ?? "");
    form.set("major", details.major ?? "");
    form.set("funny_question_answer", myProfile.funny_question_answer ?? "");
    form.set("associated_houses", JSON.stringify(myProfile.associated_houses));
    try {
      const response = await fetch("/api/profile", { method: "PATCH", body: form });
      const result: unknown = await response.json();
      if (!response.ok || !isProfileDto(result)) return false;
      setMyProfile(result);
      return true;
    } catch {
      return false;
    }
  };

  if (approval === "pending") return <ApprovalStatus chair={chairSetting === "yes"} />;
  return <main className="cal-poly-app member-app"><header className="cal-poly-header"><button className="brand brand-lockup home-logo" onClick={() => setScreen("feed")} aria-label="Back to PNM profiles"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></button><span className="role-label">{currentRole === "IFC Admin" ? "IFC ADMIN" : isRushChair ? "RUSH CHAIR HQ" : "MEMBER HQ"}</span><div className="member-profile-trigger"><button className={`${isRushChair ? "avatar member-avatar chair-avatar" : "avatar member-avatar"}${myProfile?.photo_url ? " has-profile-photo" : ""}`} onClick={() => setScreen("profile")} aria-label="Open profile">{myProfile?.photo_url ? <img src={myProfile.photo_url} alt="Your profile" /> : isRushChair ? <img src="/brand/rush-chair.jpg" alt="Rush chair profile" /> : myProfile?.full_name?.slice(0, 2).toUpperCase() || "MI"}</button><span>Profile</span></div></header>
    {screen === "feed" && <PnmFeed chapter={memberChapter} isRushChair={isRushChair} query={query} setQuery={setQuery} pnms={filtered} inviteList={inviteList} toggleInvite={toggleInvite} notes={notes} addNote={addNote} messagePnm={() => setScreen("messages")} />}
    {screen === "schedule" && <RushSchedule chapter={memberChapter} canSchedule={isRushChair} />}
    {screen === "chair" && isRushChair && <ChairControlCenter inviteList={inviteList} goToPnms={() => setScreen("feed")} />}
    {screen === "messages" && isRushChair && <ChairMessages goBack={() => setScreen("chair")} />}
    {screen === "profile" && <MemberProfile isRushChair={isRushChair} profile={myProfile} saveDetails={saveProfileDetails} />}
    {addingPnm && isRushChair && <AddPnm close={() => setAddingPnm(false)} add={(pnm) => { setPnmList([pnm, ...pnmList]); setAddingPnm(false); setScreen("feed"); }} />}
    <nav className="bottom-nav member-nav"><button className={screen === "feed" ? "nav-active" : ""} onClick={() => setScreen("feed")}><span>⌂</span>PNMs</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>Schedule</button>{isRushChair && <><button className="scan" aria-label="Add PNM" onClick={() => setAddingPnm(true)}><span>＋</span></button><button className={screen === "chair" ? "nav-active" : ""} onClick={() => setScreen("chair")}><span>✦</span>Chair tools</button><button className={screen === "messages" ? "nav-active" : ""} onClick={() => setScreen("messages")}><span>✉</span>Messages</button></>}</nav>
  </main>;
}

function ApprovalStatus({ chair }: { chair: boolean }) { const enterWorkspace = () => window.location.assign(`/member?chair=${chair ? "yes" : "no"}`); return <main className="cal-poly-app member-pending"><section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER PROFILE</p></section><section className="gateway-card"><p className="eyebrow">REQUEST SUBMITTED</p><span className="verified-mark pending">◷</span><h1>Waiting for<br />approval.</h1><p className="gateway-copy">Your active-member profile is with your chapter’s rush chair. You’ll receive member access once they confirm you.</p><section className="approval-detail"><strong>{chair ? "Rush chair profile noted" : "Active member profile noted"}</strong><span>Cal Poly email verified</span></section><section className="demo-bypass"><p>DEMO MODE</p><strong>{chair ? "Skip chair verification" : "Skip member approval"}</strong><span>For prototype review only. This will be removed when real approvals are connected.</span><button onClick={enterWorkspace}>Enter {chair ? "rush chair" : "member"} workspace →</button></section></section></main>; }

function MemberProfile({ isRushChair, profile, saveDetails }: { isRushChair: boolean; profile: ProfileDto | null; saveDetails: (details: Pick<ProfileDto, "hometown" | "major">) => Promise<boolean> }) {
  const [major, setMajor] = useState(profile?.major ?? "");
  const [hometown, setHometown] = useState(profile?.hometown ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => {
    setMajor(profile?.major ?? "");
    setHometown(profile?.hometown ?? "");
  }, [profile]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Saving…");
    setStatus(await saveDetails({ major: major || null, hometown: hometown || null }) ? "Saved" : "Could not save. Please try again.");
  };
  const displayName = profile?.full_name ?? (isRushChair ? "Rush chair" : "Active member");
  return <div className="shell pnm-profile member-profile"><section className="greeting"><p className="eyebrow">YOUR {profile?.role.toUpperCase() ?? (isRushChair ? "RUSH CHAIR" : "ACTIVE MEMBER")} PROFILE</p><h1>{displayName}</h1><p className="muted">Keep your details current so your chapter can recognize you.</p></section><section className="profile-summary">{profile?.photo_url ? <img src={profile.photo_url} alt={`${displayName} profile`} /> : <span>◌</span>}<div><strong>{displayName}</strong><small>{profile?.phone ?? "Phone not provided"}</small></div></section>{profile && <form className="profile-details" onSubmit={submit}><div className="profile-details-heading"><div><p className="eyebrow">OPTIONAL DETAILS</p><h2>About you</h2></div>{status && <span role="status">{status}</span>}</div><label>Major<input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Computer Science" /></label><label>Hometown<input value={hometown} onChange={(event) => setHometown(event.target.value)} placeholder="e.g. San Diego, CA" /></label><label>Your chapter<input value={profile.associated_houses.join(", ") || "No chapter selected"} readOnly aria-label="Your chapter" /></label><button type="submit">Save details</button></form>}</div>;
}

function PnmFeed({ chapter, isRushChair, query, setQuery, pnms: visiblePnms, inviteList, toggleInvite, notes, addNote, messagePnm }: { chapter: Chapter | null; isRushChair: boolean; query: string; setQuery: (value: string) => void; pnms: Pnm[]; inviteList: string[]; toggleInvite: (id: string) => void; notes: Record<string, string[]>; addNote: (id: string, note: string) => void; messagePnm: () => void }) { const chapterName = chapter?.name ?? "Your Chapter"; const hasQuery = Boolean(query.trim()); return <div className="shell member-feed"><section className="member-hero" style={chapter ? { "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties : undefined}><p className="eyebrow">{chapterName.toUpperCase()} · RUSH</p><h1>{isRushChair ? "View your\nPNMs." : "PNM profiles."}</h1></section><section className="reminder-card"><span>◷</span><div><strong>Rush schedule reminder</strong><p>Open House begins at 7:00 PM.</p></div><button>Set</button></section><div className="feed-search discreet"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="pnm-search">Search PNMs</label><input id="pnm-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PNMs" autoComplete="off" />{hasQuery && <button type="button" className="clear-search" onClick={() => setQuery("")} aria-label="Clear PNM search">×</button>}</div><section className="feed-label"><div><p className="eyebrow">PNM DIRECTORY</p><h2>{visiblePnms.length} {hasQuery ? "matching " : ""}profile{visiblePnms.length === 1 ? "" : "s"}</h2></div>{isRushChair && <span>{inviteList.length} selected</span>}</section><section className="pnm-feed-list">{visiblePnms.map((pnm) => <PnmCard key={pnm.id} pnm={pnm} isRushChair={isRushChair} invited={inviteList.includes(pnm.id)} toggleInvite={toggleInvite} notes={notes[pnm.id] || []} addNote={addNote} messagePnm={messagePnm} />)}{hasQuery && !visiblePnms.length && <div className="pnm-search-empty"><strong>No PNMs found</strong><span>Try a name, major, hometown, class year, or interest.</span><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</section></div>; }

function PnmCard({ pnm, isRushChair, invited, toggleInvite, notes, addNote, messagePnm }: { pnm: Pnm; isRushChair: boolean; invited: boolean; toggleInvite: (id: string) => void; notes: string[]; addNote: (id: string, note: string) => void; messagePnm: () => void }) { const [draft, setDraft] = useState(""); return <article className="pnm-card compact">{pnm.image ? <img className="profile-placeholder pnm-photo" src={pnm.image} alt={`${pnm.name} profile`} /> : <div className="profile-placeholder" aria-label="Default profile photo"></div>}<div className="pnm-card-body"><h2>{pnm.name}</h2><p className="pnm-detail">{pnm.hometown}<br />{pnm.major} · {pnm.year}</p>{isRushChair && <div className="pnm-actions"><button onClick={messagePnm}>Message PNM</button><button className={invited ? "invite-toggle selected" : "invite-toggle"} onClick={() => toggleInvite(pnm.id)}>{invited ? "✓ Invite list" : "+ Invite list"}</button></div>}<section className="notes"><p>Private discussion notes <span>{notes.length}</span></p>{notes.map((note, index) => <blockquote key={`${note}-${index}`}>{note}</blockquote>)}<div><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add note for actives & chair…" onKeyDown={(event) => { if (event.key === "Enter") { addNote(pnm.id, draft); setDraft(""); } }} /><button onClick={() => { addNote(pnm.id, draft); setDraft(""); }}>Add</button></div></section></div></article>; }

function RushSchedule({ chapter: savedChapter, canSchedule }: { chapter: Chapter | null; canSchedule: boolean }) {
  const chapter = savedChapter ?? { name: "Your Chapter", short: "IFC", colors: ["#174b3b", "#f4c34f"] as [string, string] };
  const [chapterEvents, setChapterEvents] = useState<ChapterScheduleEvent[]>([
    { date: "SEP 12", day: "FRI", title: "Open House", time: "4:00 – 6:00 PM", note: "42 checked in" },
    { date: "SEP 12", day: "FRI", title: "Chapter Social", time: "7:00 – 9:00 PM", note: "Roster follow-up" },
    { date: "SEP 13", day: "SAT", title: "Patio Social", time: "5:30 – 7:00 PM", note: "RSVP follow-up" },
    { date: "SEP 14", day: "SUN", title: "Preference Night", time: "6:00 – 8:00 PM", note: "Set-up at 5:15" },
  ]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [draft, setDraft] = useState({ title: "", date: "SEP 12", time: "", description: "" });
  const dayForDate: Record<string, string> = { "SEP 12": "FRI", "SEP 13": "SAT", "SEP 14": "SUN" };
  const dates = Array.from(new Set(chapterEvents.map((event) => event.date)));
  const createEvent = () => {
    if (!draft.title.trim() || !draft.time.trim() || !draft.description.trim()) return;
    setChapterEvents((current) => [...current, {
      date: draft.date,
      day: dayForDate[draft.date],
      title: draft.title.trim(),
      time: draft.time.trim(),
      note: draft.description.trim(),
    }]);
    setDraft({ title: "", date: "SEP 12", time: "", description: "" });
    setCreatingEvent(false);
  };
  return <div className="shell personal-schedule rush-schedule">
    <section className="greeting"><p className="eyebrow">{chapter.name.toUpperCase()} · RUSH WEEK</p><h1>My schedule</h1><p className="muted">Your chapter’s events.</p></section>
    {canSchedule && <button className="schedule-event" type="button" onClick={() => setCreatingEvent(true)}>＋ Schedule an event</button>}
    <section className="schedule-days">{dates.map((date, index) => {
      const dayEvents = chapterEvents.filter((event) => event.date === date);
      const [month, day] = date.split(" ");
      return <section className="today-events" key={date}>
        <header className="today-events-header"><div><p className="eyebrow">{index === 0 ? "TODAY'S EVENTS" : index === 1 ? "NEXT DAY" : "UPCOMING DAY"}</p><h2>{dayEvents[0].day} · {month} {day}</h2></div><span>{dayEvents.length} planned</span></header>
        <div className="today-event-list">{dayEvents.map((event) => <article className="today-event-card member-schedule-card" key={`${event.date}-${event.title}`} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}>
          <span className="today-event-mark">{chapter.short}</span><span className="today-event-copy"><small>{chapter.name}</small><strong>{event.title}</strong><em>◷ {event.time}</em><small>{event.note}</small></span>
        </article>)}</div>
      </section>;
    })}</section>
    {canSchedule && creatingEvent && <div className="member-modal" role="dialog" aria-modal="true" aria-label="Schedule an event"><section><button className="sheet-close" type="button" onClick={() => setCreatingEvent(false)} aria-label="Close">×</button><p className="eyebrow">NEW CHAPTER EVENT</p><h2>Schedule an event</h2><p>Add the event details for {chapter.name}.</p><label>Event name<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Game Night" /></label><label>Date<select value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })}><option value="SEP 12">Friday · Sep 12</option><option value="SEP 13">Saturday · Sep 13</option><option value="SEP 14">Sunday · Sep 14</option></select></label><label>Time<input value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} placeholder="e.g. 7:00 – 9:00 PM" /></label><label>Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What should members know about this event?" rows={3} /></label><button className="gateway-next" type="button" disabled={!draft.title.trim() || !draft.time.trim() || !draft.description.trim()} onClick={createEvent}>Add to schedule →</button></section></div>}
  </div>;
}

function ChairControlCenter({ inviteList, goToPnms }: { inviteList: string[]; goToPnms: () => void }) { const [view, setView] = useState<"home" | "invites" | "messages">("home"); const [custom, setCustom] = useState("Hey! We loved meeting you at Open House. We’d love to see you at our next event."); const [confirm, setConfirm] = useState(false); const [sent, setSent] = useState(false); if (view === "invites") return <div className="shell chair-center"><button className="back-button" onClick={() => setView("home")}>← Rush chair tools</button><p className="eyebrow">ROUND 1 INVITATIONS</p><h1>Review before<br />you send.</h1><p className="muted">{inviteList.length || "No"} PNM{inviteList.length === 1 ? "" : "s"} selected from the feed.</p><label className="message-template">Invitation text<textarea value={custom} onChange={(event) => setCustom(event.target.value)} /></label>{!confirm ? <button className="gateway-next" disabled={!inviteList.length} onClick={() => setConfirm(true)}>Review send →</button> : !sent ? <section className="send-confirm"><strong>Send to {inviteList.length} PNM{inviteList.length === 1 ? "" : "s"}?</strong><p>This will send the text and add the event to each PNM’s schedule. This can’t be undone.</p><button className="gateway-next" onClick={() => setSent(true)}>Yes, send invitations</button><button onClick={() => setConfirm(false)}>Go back</button></section> : <section className="message-sent full-page"><span>✓</span><h2>Invitations sent</h2><p>Delivery status will appear here as messages are sent.</p></section>}</div>; if (view === "messages") return <ChairMessages goBack={() => setView("home")} />; return <div className="shell chair-center"><section className="chair-hero"><p className="eyebrow">RUSH CHAIR HQ</p><h1>Lead the<br /><em>next round.</em></h1><p>Choose what you want to manage first.</p></section><section className="chair-actions"><button><span>＋</span><strong>Create an event</strong><small>Set a round, time, and location</small><b>→</b></button><button onClick={goToPnms}><span>◫</span><strong>View PNMs</strong><small>Search profiles and add to invite list</small><b>→</b></button><button onClick={() => setView("invites")}><span>✦</span><strong>Send invites</strong><small>{inviteList.length} PNMs waiting for review</small><b>→</b></button></section></div>; }

function ChairMessages({ goBack }: { goBack: () => void }) { const [reply, setReply] = useState(""); const [replies, setReplies] = useState<string[]>([]); return <div className="shell chair-messages"><button className="back-button" onClick={goBack}>← Rush chair tools</button><p className="eyebrow">PRIVATE PNM MESSAGES</p><h1>Stay in the<br />conversation.</h1><section className="conversation"><header><span>MR</span><div><strong>Maya Rodriguez</strong><small>Asked 14m ago</small></div></header><div className="incoming">Hi! Is there a dress code for Friday’s patio social?</div>{replies.map((message) => <div className="outgoing" key={message}>{message}</div>)}<div className="reply-box"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a private reply…" /><button onClick={() => { if (reply.trim()) { setReplies([...replies, reply]); setReply(""); } }}>Send</button></div></section></div>; }

function AddPnm({ close, add }: { close: () => void; add: (pnm: Pnm) => void }) { const [name, setName] = useState(""); const [major, setMajor] = useState(""); return <div className="member-modal"><section><button className="sheet-close" onClick={close}>×</button><p className="eyebrow">ADD PNM</p><h2>New attendee</h2><p>Add someone you met at the door or through a manual sign-in.</p><label>Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" /></label><label>Major <span>(optional)</span><input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Business" /></label><button className="gateway-next" disabled={!name.trim()} onClick={() => add({ id: `manual-${Date.now()}`, name: name.trim(), major: major || "Not provided", year: "PNM", hometown: "Added manually", attended: "Manual check-in", tags: ["New"], image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85" })}>Add to PNM feed</button></section></div>; }
