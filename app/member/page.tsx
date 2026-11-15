"use client";

import { useEffect, useMemo, useState } from "react";
import { isProfileDto, type ProfileDto, type ProfileRole } from "@/lib/profile-domain";
import { chapters, type Chapter } from "@/lib/chapters";
import { allowedProgressUpdates, isPnmDirectoryList, isRushEventList, RUSH_PROGRESS_STAGES, type PnmDirectoryDto, type RushEventDto, type RushProgressStage } from "@/lib/rush-domain";

type Pnm = { id: string; name: string; major: string; year: string; hometown: string; attended: string; tags: string[]; image: string; status: RushProgressStage | null };

const searchableText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .trim();

function pnmFromDto(dto: PnmDirectoryDto, chapterName: string | null): Pnm {
  return {
    id: dto.id,
    name: dto.full_name,
    major: dto.major || "Not provided",
    year: "PNM",
    hometown: dto.hometown || "Not provided",
    attended: "",
    tags: [],
    image: dto.photo_url ?? "",
    status: chapterName ? dto.progress[chapterName] ?? null : null,
  };
}

function formatRushEventTime(event: RushEventDto) {
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${new Date(event.starts_at).toLocaleString("en-US", options)} – ${new Date(event.ends_at).toLocaleString("en-US", options)}`;
}

export default function MemberPortal() {
  const [approval, setApproval] = useState<string | null>(null);
  const [chairSetting, setChairSetting] = useState<string | null>(null);
  const [roleSetting, setRoleSetting] = useState<ProfileRole | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileDto | null>(null);
  const [screen, setScreen] = useState<"feed" | "schedule" | "chair" | "messages" | "profile">("feed");
  const [query, setQuery] = useState("");
  const [pnmList, setPnmList] = useState<Pnm[]>([]);
  const [pnmLoadError, setPnmLoadError] = useState<string | null>(null);
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
      if (!myProfile || myProfile.role === "PNM") return;
      try {
        const chapterName = myProfile.role === "IFC Admin" ? null : myProfile.associated_houses[0] ?? null;
        const queryString = chapterName ? `?chapter=${encodeURIComponent(chapterName)}` : "";
        const response = await fetch(`/api/profiles${queryString}`, { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !isPnmDirectoryList(result)) throw new Error("Could not load the PNM directory.");
        if (active) {
          setPnmList(result.map((pnm) => pnmFromDto(pnm, chapterName)));
          setPnmLoadError(null);
        }
      } catch {
        if (active) setPnmLoadError("Could not load saved PNM profiles. Please refresh to try again.");
      }
    }
    void loadPnmDirectory();
    return () => { active = false; };
  }, [myProfile]);
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
  const updateProgress = async (pnmId: string, status: RushProgressStage) => {
    if (!memberChapter) return;
    try {
      const response = await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnm_id: pnmId, chapter_name: memberChapter.name, status }),
      });
      if (!response.ok) throw new Error("Could not update progress.");
      setPnmList((current) => current.map((pnm) => pnm.id === pnmId ? { ...pnm, status } : pnm));
    } catch {
      setPnmLoadError("Could not save the PNM's progress. Please try again.");
    }
  };
  const addPnm = async (details: { full_name: string; phone: string; major: string; hometown: string }) => {
    if (!memberChapter) {
      setPnmLoadError("Select a chapter on your profile before adding a PNM.");
      return false;
    }
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, chapter_name: memberChapter.name }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !isPnmDirectoryList([value])) {
        const message = value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "Could not add the PNM.";
        setPnmLoadError(message);
        return false;
      }
      setPnmList((current) => [pnmFromDto(value as PnmDirectoryDto, memberChapter.name), ...current]);
      setPnmLoadError(null);
      return true;
    } catch {
      setPnmLoadError("Could not add the PNM. Please try again.");
      return false;
    }
  };
  const saveProfileDetails = async (details: Pick<ProfileDto, "hometown" | "major"> & { associated_houses?: string[] }) => {
    if (!myProfile) return false;
    const form = new FormData();
    form.set("role", myProfile.role);
    form.set("full_name", myProfile.full_name);
    form.set("phone", myProfile.phone);
    form.set("hometown", details.hometown ?? "");
    form.set("major", details.major ?? "");
    form.set("funny_question_answer", myProfile.funny_question_answer ?? "");
    form.set("associated_houses", JSON.stringify(details.associated_houses ?? myProfile.associated_houses));
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
  const switchProfile = async () => {
    try {
      await fetch("/api/profile", { method: "DELETE" });
    } catch { /* Continue to the account gateway if the demo request fails. */ }
    window.location.assign("/");
  };

  if (approval === "pending") return <ApprovalStatus chair={chairSetting === "yes"} />;
  return <main className="cal-poly-app member-app"><header className="cal-poly-header"><button className="brand brand-lockup home-logo" onClick={() => setScreen("feed")} aria-label="Back to PNM profiles"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></button><span className="role-label">{currentRole === "IFC Admin" ? "IFC ADMIN" : isRushChair ? "RUSH CHAIR HQ" : "MEMBER HQ"}</span><div className="member-profile-trigger"><button className={`${isRushChair ? "avatar member-avatar chair-avatar" : "avatar member-avatar"}${myProfile?.photo_url ? " has-profile-photo" : ""}`} onClick={() => setScreen("profile")} aria-label="Open profile">{myProfile?.photo_url ? <img src={myProfile.photo_url} alt="Your profile" /> : isRushChair ? <img src="/brand/rush-chair.jpg" alt="Rush chair profile" /> : myProfile?.full_name?.slice(0, 2).toUpperCase() || "MI"}</button><span>Profile</span></div></header>
    {screen === "feed" && <PnmFeed chapter={memberChapter} isRushChair={isRushChair} query={query} setQuery={setQuery} pnms={filtered} inviteList={inviteList} toggleInvite={toggleInvite} notes={notes} addNote={addNote} messagePnm={() => setScreen("messages")} updateProgress={updateProgress} loadError={pnmLoadError} />}
    {screen === "schedule" && <RushSchedule chapter={memberChapter} canSchedule={isRushChair} />}
    {screen === "chair" && isRushChair && <ChairControlCenter inviteList={inviteList} goToPnms={() => setScreen("feed")} />}
    {screen === "messages" && isRushChair && <ChairMessages goBack={() => setScreen("chair")} />}
    {screen === "profile" && <MemberProfile isRushChair={isRushChair} profile={myProfile} saveDetails={saveProfileDetails} switchProfile={switchProfile} />}
    {addingPnm && isRushChair && <AddPnm chapterName={memberChapter?.name ?? ""} close={() => setAddingPnm(false)} add={async (details) => { const saved = await addPnm(details); if (saved) { setAddingPnm(false); setScreen("feed"); } }} />}
    <nav className="bottom-nav member-nav"><button className={screen === "feed" ? "nav-active" : ""} onClick={() => setScreen("feed")}><span>⌂</span>PNMs</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>Schedule</button>{isRushChair && <><button className="scan" aria-label="Add PNM" onClick={() => setAddingPnm(true)}><span>＋</span></button><button className={screen === "chair" ? "nav-active" : ""} onClick={() => setScreen("chair")}><span>✦</span>Chair tools</button><button className={screen === "messages" ? "nav-active" : ""} onClick={() => setScreen("messages")}><span>✉</span>Messages</button></>}</nav>
  </main>;
}

function ApprovalStatus({ chair }: { chair: boolean }) { const enterWorkspace = () => window.location.assign(`/member?chair=${chair ? "yes" : "no"}`); return <main className="cal-poly-app member-pending"><section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER PROFILE</p></section><section className="gateway-card"><p className="eyebrow">REQUEST SUBMITTED</p><span className="verified-mark pending">◷</span><h1>Waiting for<br />approval.</h1><p className="gateway-copy">Your active-member profile is with your chapter’s rush chair. You’ll receive member access once they confirm you.</p><section className="approval-detail"><strong>{chair ? "Rush chair profile noted" : "Active member profile noted"}</strong><span>Cal Poly email verified</span></section><section className="demo-bypass"><p>DEMO MODE</p><strong>{chair ? "Skip chair verification" : "Skip member approval"}</strong><span>For prototype review only. This will be removed when real approvals are connected.</span><button onClick={enterWorkspace}>Enter {chair ? "rush chair" : "member"} workspace →</button></section></section></main>; }

function MemberProfile({ isRushChair, profile, saveDetails, switchProfile }: { isRushChair: boolean; profile: ProfileDto | null; saveDetails: (details: Pick<ProfileDto, "hometown" | "major"> & { associated_houses?: string[] }) => Promise<boolean>; switchProfile: () => Promise<void> }) {
  const [major, setMajor] = useState(profile?.major ?? "");
  const [hometown, setHometown] = useState(profile?.hometown ?? "");
  const [chapter, setChapter] = useState(profile?.associated_houses[0] ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => {
    setMajor(profile?.major ?? "");
    setHometown(profile?.hometown ?? "");
    setChapter(profile?.associated_houses[0] ?? "");
  }, [profile]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Saving…");
    const associatedHouses = profile?.role === "IFC Admin" ? profile.associated_houses : chapter ? [chapter] : [];
    setStatus(await saveDetails({ major: major || null, hometown: hometown || null, associated_houses: associatedHouses }) ? "Saved" : "Could not save. Please try again.");
  };
  const displayName = profile?.full_name ?? (isRushChair ? "Rush chair" : "Active member");
  return <div className="shell pnm-profile member-profile"><section className="greeting"><p className="eyebrow">YOUR {profile?.role.toUpperCase() ?? (isRushChair ? "RUSH CHAIR" : "ACTIVE MEMBER")} PROFILE</p><h1>{displayName}</h1><p className="muted">Keep your details current so your chapter can recognize you.</p></section><section className="profile-summary">{profile?.photo_url ? <img src={profile.photo_url} alt={`${displayName} profile`} /> : <span>◌</span>}<div><strong>{displayName}</strong><small>{profile?.phone ?? "Phone not provided"}</small></div></section>{profile && <form className="profile-details" onSubmit={submit}><div className="profile-details-heading"><div><p className="eyebrow">OPTIONAL DETAILS</p><h2>About you</h2></div>{status && <span role="status">{status}</span>}</div><label>Major<input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Computer Science" /></label><label>Hometown<input value={hometown} onChange={(event) => setHometown(event.target.value)} placeholder="e.g. San Diego, CA" /></label>{profile.role === "IFC Admin" ? <label>Your chapter<input value="All recognized houses" readOnly /></label> : <label>Your chapter<select required value={chapter} onChange={(event) => setChapter(event.target.value)}><option value="">Choose your chapter</option>{chapters.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>}<button type="submit">Save details</button></form>}<button className="schedule-event" type="button" onClick={() => void switchProfile()}>Switch profile</button></div>;
}

function PnmFeed({ chapter, isRushChair, query, setQuery, pnms: visiblePnms, inviteList, toggleInvite, notes, addNote, messagePnm, updateProgress, loadError }: { chapter: Chapter | null; isRushChair: boolean; query: string; setQuery: (value: string) => void; pnms: Pnm[]; inviteList: string[]; toggleInvite: (id: string) => void; notes: Record<string, string[]>; addNote: (id: string, note: string) => void; messagePnm: () => void; updateProgress: (id: string, status: RushProgressStage) => void; loadError: string | null }) {
  const chapterName = chapter?.name ?? "Your Chapter";
  const hasQuery = Boolean(query.trim());
  return <div className="shell member-feed">
    <section className="member-hero" style={chapter ? { "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties : undefined}><p className="eyebrow">{chapterName.toUpperCase()} · RUSH</p><h1>{isRushChair ? "View your\nPNMs." : "PNM profiles."}</h1></section>
    <section className="reminder-card"><span>◷</span><div><strong>Rush schedule reminder</strong><p>View upcoming chapter events from the Schedule tab.</p></div><button>Set</button></section>
    {loadError && <p role="alert" className="directory-note">{loadError}</p>}
    <div className="feed-search discreet"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="pnm-search">Search PNMs</label><input id="pnm-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PNMs" autoComplete="off" />{hasQuery && <button type="button" className="clear-search" onClick={() => setQuery("")} aria-label="Clear PNM search">×</button>}</div>
    <section className="feed-label"><div><p className="eyebrow">PNM DIRECTORY</p><h2>{visiblePnms.length} {hasQuery ? "matching " : ""}profile{visiblePnms.length === 1 ? "" : "s"}</h2></div>{isRushChair && <span>{inviteList.length} selected</span>}</section>
    <section className="pnm-feed-list">{visiblePnms.map((pnm) => <PnmCard key={pnm.id} pnm={pnm} isRushChair={isRushChair} invited={inviteList.includes(pnm.id)} toggleInvite={toggleInvite} notes={notes[pnm.id] || []} addNote={addNote} messagePnm={messagePnm} updateProgress={updateProgress} />)}{!visiblePnms.length && !hasQuery && <div className="empty-state"><span>✦</span><h3>No saved PNMs yet</h3><p>Add PNM profiles from the + button. They will appear here after saving.</p></div>}{hasQuery && !visiblePnms.length && <div className="pnm-search-empty"><strong>No PNMs found</strong><span>Try a name, major, hometown, class year, or interest.</span><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</section>
  </div>;
}

function PnmCard({ pnm, isRushChair, invited, toggleInvite, notes, addNote, messagePnm, updateProgress }: { pnm: Pnm; isRushChair: boolean; invited: boolean; toggleInvite: (id: string) => void; notes: string[]; addNote: (id: string, note: string) => void; messagePnm: () => void; updateProgress: (id: string, status: RushProgressStage) => void }) {
  const [draft, setDraft] = useState("");
  return <article className="pnm-card compact">{pnm.image ? <img className="profile-placeholder pnm-photo" src={pnm.image} alt={`${pnm.name} profile`} /> : <div className="profile-placeholder" aria-label="Default profile photo"></div>}<div className="pnm-card-body"><h2>{pnm.name}</h2><p className="pnm-detail">{pnm.hometown}<br />{pnm.major} · {pnm.year}</p>{isRushChair && <><label className="pnm-progress-select">Rush progress<select value={pnm.status ?? "open invite"} onChange={(event) => updateProgress(pnm.id, event.target.value as RushProgressStage)}>{allowedProgressUpdates(pnm.status).map((stage) => <option value={stage} key={stage}>{stage}</option>)}</select></label><div className="pnm-actions"><button onClick={messagePnm}>Message PNM</button><button className={invited ? "invite-toggle selected" : "invite-toggle"} onClick={() => toggleInvite(pnm.id)}>{invited ? "✓ Invite list" : "+ Invite list"}</button></div></>}<section className="notes"><p>Private discussion notes <span>{notes.length}</span></p>{notes.map((note, index) => <blockquote key={`${note}-${index}`}>{note}</blockquote>)}<div><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add note for actives & chair…" onKeyDown={(event) => { if (event.key === "Enter") { addNote(pnm.id, draft); setDraft(""); } }} /><button onClick={() => { addNote(pnm.id, draft); setDraft(""); }}>Add</button></div></section></div></article>;
}

function RushSchedule({ chapter, canSchedule }: { chapter: Chapter | null; canSchedule: boolean }) {
  const [chapterEvents, setChapterEvents] = useState<RushEventDto[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draft, setDraft] = useState({ event_type: "open invite" as RushProgressStage, address: "", starts_at: "", ends_at: "" });
  useEffect(() => {
    let active = true;
    async function loadEvents() {
      if (!chapter) return;
      try {
        const response = await fetch(`/api/events?chapter=${encodeURIComponent(chapter.name)}`, { cache: "no-store" });
        const value: unknown = await response.json();
        if (!response.ok || !isRushEventList(value)) throw new Error("Could not load chapter events.");
        if (active) setChapterEvents(value);
      } catch {
        if (active) setSaveError("Could not load saved events. Please refresh to try again.");
      }
    }
    void loadEvents();
    return () => { active = false; };
  }, [chapter]);

  const createEvent = async () => {
    if (!chapter || !draft.address.trim() || !draft.starts_at || !draft.ends_at) return;
    setSaveError("");
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_name: chapter.name,
          event_type: draft.event_type,
          address: draft.address.trim(),
          starts_at: new Date(draft.starts_at).toISOString(),
          ends_at: new Date(draft.ends_at).toISOString(),
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const message = value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "Could not save the event.";
        setSaveError(message);
        return;
      }
      const reload = await fetch(`/api/events?chapter=${encodeURIComponent(chapter.name)}`, { cache: "no-store" });
      const savedEvents: unknown = await reload.json();
      if (!reload.ok || !isRushEventList(savedEvents)) throw new Error("Could not reload saved events.");
      setChapterEvents(savedEvents);
      setDraft({ event_type: "open invite", address: "", starts_at: "", ends_at: "" });
      setCreatingEvent(false);
    } catch {
      setSaveError("Could not save the event. Check the dates and try again.");
    }
  };

  const dates = Array.from(new Set(chapterEvents.map((event) => new Date(event.starts_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }))));
  return <div className="shell personal-schedule rush-schedule">
    <section className="greeting"><p className="eyebrow">{chapter?.name.toUpperCase() ?? "IFC"} · RUSH WEEK</p><h1>Chapter events</h1><p className="muted">Events and sign-up counts saved for this rush cycle.</p></section>
    {saveError && <p className="directory-note" role="alert">{saveError}</p>}
    {canSchedule && chapter && <button className="schedule-event" type="button" onClick={() => setCreatingEvent(true)}>＋ Schedule an event</button>}
    {!chapter ? <section className="empty-state"><span>◫</span><h3>No chapter selected</h3><p>Add a chapter to your profile to view its event calendar.</p></section> : !chapterEvents.length ? <section className="empty-state"><span>◫</span><h3>No events scheduled</h3><p>Schedule the chapter’s first event to get it into the PNM portal.</p></section> : <section className="schedule-days">{dates.map((date, index) => {
      const dayEvents = chapterEvents.filter((event) => new Date(event.starts_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) === date);
      const dayName = new Date(dayEvents[0].starts_at).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      return <section className="today-events" key={date}>
        <header className="today-events-header"><div><p className="eyebrow">{index === 0 ? "UPCOMING EVENTS" : "LATER"}</p><h2>{dayName} · {date}</h2></div><span>{dayEvents.length} events</span></header>
        <div className="today-event-list">{dayEvents.map((event) => <article className="today-event-card member-schedule-card" key={event.id} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}>
          <span className="today-event-mark">{chapter.short}</span><span className="today-event-copy"><small>{chapter.name}</small><strong>{event.event_type}</strong><em>◷ {formatRushEventTime(event)}</em><small>⌖ {event.address} · {event.signup_count} signed up</small></span>
        </article>)}</div>
      </section>;
    })}</section>}
    {canSchedule && chapter && creatingEvent && <div className="member-modal" role="dialog" aria-modal="true" aria-label="Schedule an event"><section><button className="sheet-close" type="button" onClick={() => setCreatingEvent(false)} aria-label="Close">×</button><p className="eyebrow">NEW CHAPTER EVENT</p><h2>Schedule an event</h2><p>Add the event details for {chapter.name}.</p>
      <label>Type<select value={draft.event_type} onChange={(event) => setDraft({ ...draft, event_type: event.target.value as RushProgressStage })}>{RUSH_PROGRESS_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
      <label>Address<input autoFocus value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Street address" /></label>
      <label>Start date and time<input type="datetime-local" value={draft.starts_at} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })} /></label>
      <label>End date and time<input type="datetime-local" value={draft.ends_at} onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })} /></label>
      <button className="gateway-next" type="button" disabled={!draft.address.trim() || !draft.starts_at || !draft.ends_at} onClick={() => void createEvent()}>Save event →</button>
    </section></div>}
  </div>;
}

function ChairControlCenter({ inviteList, goToPnms }: { inviteList: string[]; goToPnms: () => void }) { const [view, setView] = useState<"home" | "invites" | "messages">("home"); const [custom, setCustom] = useState("Hey! We loved meeting you at Open House. We’d love to see you at our next event."); const [confirm, setConfirm] = useState(false); const [sent, setSent] = useState(false); if (view === "invites") return <div className="shell chair-center"><button className="back-button" onClick={() => setView("home")}>← Rush chair tools</button><p className="eyebrow">ROUND 1 INVITATIONS</p><h1>Review before<br />you send.</h1><p className="muted">{inviteList.length || "No"} PNM{inviteList.length === 1 ? "" : "s"} selected from the feed.</p><label className="message-template">Invitation text<textarea value={custom} onChange={(event) => setCustom(event.target.value)} /></label>{!confirm ? <button className="gateway-next" disabled={!inviteList.length} onClick={() => setConfirm(true)}>Review send →</button> : !sent ? <section className="send-confirm"><strong>Send to {inviteList.length} PNM{inviteList.length === 1 ? "" : "s"}?</strong><p>This will send the text and add the event to each PNM’s schedule. This can’t be undone.</p><button className="gateway-next" onClick={() => setSent(true)}>Yes, send invitations</button><button onClick={() => setConfirm(false)}>Go back</button></section> : <section className="message-sent full-page"><span>✓</span><h2>Invitations sent</h2><p>Delivery status will appear here as messages are sent.</p></section>}</div>; if (view === "messages") return <ChairMessages goBack={() => setView("home")} />; return <div className="shell chair-center"><section className="chair-hero"><p className="eyebrow">RUSH CHAIR HQ</p><h1>Lead the<br /><em>next round.</em></h1><p>Choose what you want to manage first.</p></section><section className="chair-actions"><button><span>＋</span><strong>Create an event</strong><small>Set a round, time, and location</small><b>→</b></button><button onClick={goToPnms}><span>◫</span><strong>View PNMs</strong><small>Search profiles and add to invite list</small><b>→</b></button><button onClick={() => setView("invites")}><span>✦</span><strong>Send invites</strong><small>{inviteList.length} PNMs waiting for review</small><b>→</b></button></section></div>; }

function ChairMessages({ goBack }: { goBack: () => void }) { const [reply, setReply] = useState(""); const [replies, setReplies] = useState<string[]>([]); return <div className="shell chair-messages"><button className="back-button" onClick={goBack}>← Rush chair tools</button><p className="eyebrow">PRIVATE PNM MESSAGES</p><h1>Stay in the<br />conversation.</h1><section className="conversation"><header><span>MR</span><div><strong>Maya Rodriguez</strong><small>Asked 14m ago</small></div></header><div className="incoming">Hi! Is there a dress code for Friday’s patio social?</div>{replies.map((message) => <div className="outgoing" key={message}>{message}</div>)}<div className="reply-box"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a private reply…" /><button onClick={() => { if (reply.trim()) { setReplies([...replies, reply]); setReply(""); } }}>Send</button></div></section></div>; }

function AddPnm({ chapterName, close, add }: { chapterName: string; close: () => void; add: (details: { full_name: string; phone: string; major: string; hometown: string }) => Promise<boolean> }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [major, setMajor] = useState("");
  const [hometown, setHometown] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = await add({ full_name: fullName.trim(), phone: phone.trim(), major: major.trim(), hometown: hometown.trim() });
      if (!saved) setError("Could not save this PNM. Please correct the details and try again.");
    } finally {
      setSaving(false);
    }
  };
  return <div className="member-modal"><section><button className="sheet-close" onClick={close}>×</button><p className="eyebrow">ADD PNM · {chapterName.toUpperCase()}</p><h2>New PNM profile</h2><p>This profile and its open invite progress will be saved to the local database.</p><label>Full name<input autoFocus required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Henry Mitchell" /></label><label>Mobile number<input required type="tel" inputMode="tel" pattern="\+[1-9][0-9]{7,14}" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+13428765643" /></label><label>Major <span>(optional)</span><input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Business" /></label><label>Hometown <span>(optional)</span><input value={hometown} onChange={(event) => setHometown(event.target.value)} placeholder="e.g. San Francisco" /></label>{error && <p role="alert">{error}</p>}<button className="gateway-next" disabled={saving || fullName.trim().length < 2 || !/^\+[1-9]\d{7,14}$/.test(phone.trim())} onClick={() => void submit()}>{saving ? "Saving…" : "Save PNM profile"}</button></section></div>;
}
