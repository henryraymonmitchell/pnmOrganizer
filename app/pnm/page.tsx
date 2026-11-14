"use client";

import { ChangeEvent, useState } from "react";

type Chapter = { name: string; short: string; colors: [string, string] };
type RushEvent = { id: string; chapter: string; title: string; date: string; time: string; place: string };

const chapters: Chapter[] = [
  { name: "Alpha Epsilon Pi", short: "AΕΠ", colors: ["#0e5b9a", "#f8c629"] }, { name: "Alpha Sigma Phi", short: "ΑΣΦ", colors: ["#cf1530", "#929ba0"] },
  { name: "Beta Theta Pi", short: "ΒΘΠ", colors: ["#142d60", "#ffffff"] }, { name: "Delta Chi", short: "ΔΧ", colors: ["#e0062f", "#ffd34e"] },
  { name: "Delta Sigma Phi", short: "ΔΣΦ", colors: ["#008f3b", "#ffd300"] }, { name: "Delta Upsilon", short: "ΔΥ", colors: ["#2f619b", "#ffce47"] },
  { name: "Kappa Sigma", short: "ΚΣ", colors: ["#be0d3d", "#ffffff"] }, { name: "Lambda Chi Alpha", short: "ΛΧΑ", colors: ["#00733e", "#dca82c"] },
  { name: "Phi Delta Theta", short: "ΦΔΘ", colors: ["#192b5f", "#d9b56d"] }, { name: "Phi Gamma Delta", short: "FIJI", colors: ["#48206f", "#ffffff"] },
  { name: "Phi Kappa Psi", short: "ΦΚΨ", colors: ["#f2a821", "#171717"] }, { name: "Phi Sigma Kappa", short: "ΦΣΚ", colors: ["#c8143b", "#d6d6d6"] },
  { name: "Pi Kappa Phi", short: "ΠΚΦ", colors: ["#00529b", "#e2ad2e"] }, { name: "Sigma Nu", short: "ΣΝ", colors: ["#b29a66", "#ffffff"] },
  { name: "Sigma Phi Epsilon", short: "ΣΦΕ", colors: ["#70399a", "#ffffff"] }, { name: "Sigma Pi", short: "ΣΠ", colors: ["#4c466f", "#ffffff"] },
  { name: "Theta Chi", short: "ΘΧ", colors: ["#da1830", "#ffffff"] }, { name: "Zeta Beta Tau", short: "ΖΒΤ", colors: ["#103b62", "#ffcc19"] },
  { name: "Pi Kappa Alpha", short: "ΠΚΑ", colors: ["#84202c", "#ffffff"] }
];

const events: RushEvent[] = chapters.flatMap((chapter, index) => [
  { id: `${index}-open`, chapter: chapter.name, title: "Open House", date: `SEP ${10 + (index % 4)}`, time: "7:00 – 9:00 PM", place: `${100 + index} Fraternity Row` },
  { id: `${index}-social`, chapter: chapter.name, title: "Chapter Social", date: `SEP ${12 + (index % 3)}`, time: "5:30 – 7:30 PM", place: `${100 + index} Fraternity Row` }
]);

export default function PnmPortal() {
  const [profile, setProfile] = useState({ name: "", phone: "", photo: "" });
  const [step, setStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<"home" | "chapter" | "schedule" | "messages" | "profile">("home");
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [mySchedule, setMySchedule] = useState<string[]>([]);

  if (!isReady) return <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} complete={() => setIsReady(true)} />;

  const selectChapter = (chapter: Chapter) => { setSelectedChapter(chapter); setScreen("chapter"); };
  const addEvent = (id: string) => setMySchedule((current) => current.includes(id) ? current : [...current, id]);
  const chapterStyle = selectedChapter ? { "--chapter": selectedChapter.colors[0], "--chapter-accent": selectedChapter.colors[1] } as React.CSSProperties : undefined;
  return <main className={`cal-poly-app${screen === "chapter" ? " chapter-portal" : ""}`} style={chapterStyle}>
    <header className="cal-poly-header"><button className="brand brand-lockup home-logo" onClick={() => setScreen("home")} aria-label="Back to all chapters"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></button><span className="role-label">PNM PORTAL</span><button className="avatar" onClick={() => setScreen("profile")} aria-label="Open profile">{profile.name.slice(0, 2).toUpperCase() || "PN"}</button></header>
    {screen === "home" && <ChapterDirectory name={profile.name} selectChapter={selectChapter} />}
    {screen === "chapter" && selectedChapter && <ChapterEvents chapter={selectedChapter} goBack={() => setScreen("home")} scheduled={mySchedule} addEvent={addEvent} />}
    {screen === "schedule" && <PersonalSchedule ids={mySchedule} removeEvent={(id) => setMySchedule((current) => current.filter((event) => event !== id))} />}
    {screen === "messages" && <PnmMessages />}
    {screen === "profile" && <PnmProfile profile={profile} />}
    <nav className="bottom-nav pnm-nav"><button className={screen === "home" ? "nav-active" : ""} onClick={() => setScreen("home")}><span>⌂</span>Home</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>My schedule</button><button className={screen === "messages" ? "nav-active" : ""} onClick={() => setScreen("messages")}><span className="plane-icon">➤</span>Messages</button><button className={screen === "profile" ? "nav-active" : ""} onClick={() => setScreen("profile")}><span>◌</span>Profile</button></nav>
  </main>;
}

function Onboarding({ profile, setProfile, step, setStep, complete }: { profile: { name: string; phone: string; photo: string }; setProfile: (profile: { name: string; phone: string; photo: string }) => void; step: number; setStep: (step: number) => void; complete: () => void }) {
  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => { const photo = event.target.files?.[0]; if (photo) setProfile({ ...profile, photo: URL.createObjectURL(photo) }); };
  const canContinue = step === 0 ? profile.name.trim().length > 1 : step === 1 ? profile.phone.trim().length > 6 : Boolean(profile.photo);
  return <main className="cal-poly-app onboarding"><section className="onboarding-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><span>FALL RUSH ’26</span></section><section className="onboarding-body"><div className="step-indicator"><b className={step >= 0 ? "done" : ""}></b><b className={step >= 1 ? "done" : ""}></b><b className={step >= 2 ? "done" : ""}></b></div>
    {step === 0 && <><p className="eyebrow">STEP 1 OF 3</p><h1>What should we<br />call you?</h1><p>Start with your name so every chapter can welcome you personally.</p><label>Your full name<input autoFocus value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="e.g. Maya Rodriguez" /></label></>}
    {step === 1 && <><p className="eyebrow">STEP 2 OF 3</p><h1>Your phone<br />number.</h1><p>We’ll only use it for important rush updates and invitations.</p><label>Mobile number<input autoFocus inputMode="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="(805) 555-0123" /></label><small>By continuing, you agree to receive IFC rush texts. You can opt out anytime.</small></>}
    {step === 2 && <><p className="eyebrow">STEP 3 OF 3</p><h1>Add a clear<br />photo of you.</h1><p>It helps chapters recognize you at their front booth—so check-in stays quick.</p><label className="photo-upload">{profile.photo ? <img src={profile.photo} alt="Profile preview" /> : <span>＋</span>}<input type="file" accept="image/*" onChange={updatePhoto} /><b>{profile.photo ? "Change photo" : "Choose a photo"}</b></label></>}
    <button className="onboarding-next" disabled={!canContinue} onClick={() => step === 2 ? complete() : setStep(step + 1)}>{step === 2 ? "Enter rush →" : "Continue →"}</button><button className="later-link" type="button">You can add your major and hometown later</button>
  </section></main>;
}

function ChapterDirectory({ name, selectChapter }: { name: string; selectChapter: (chapter: Chapter) => void }) { return <div className="shell chapter-directory"><section className="greeting"><div className="greeting-mark"><img src="/brand/cal-poly-cp.png" alt="Cal Poly" /></div><p className="eyebrow">CAL POLY IFC · FALL RUSH ’26</p><h1>Welcome, {name.split(" ")[0]}.</h1><p className="muted">Explore every chapter and build your rush plan.</p></section><section className="directory-note"><span>✦</span><p>Tap a chapter to see its events. Add only the events you plan to attend.</p></section><section className="section-heading"><div><p className="eyebrow">RECOGNIZED CHAPTERS</p><h3>Find your fit</h3></div><span className="chapter-count">{chapters.length}</span></section><section className="chapter-grid">{chapters.map((chapter) => <button className="chapter-tile chapter-letter-tile" key={chapter.name} onClick={() => selectChapter(chapter)} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}><span className="tile-letters">{chapter.short}</span><strong>{chapter.name}</strong><small>View events <b>→</b></small></button>)}</section></div>; }

function ChapterEvents({ chapter, goBack, scheduled, addEvent }: { chapter: Chapter; goBack: () => void; scheduled: string[]; addEvent: (id: string) => void }) { const chapterEvents = events.filter((event) => event.chapter === chapter.name); return <div className="shell event-detail chapter-theme" style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}><button className="back-button" onClick={goBack}>← All chapters</button><section className="chapter-detail-hero"><span className="chapter-display-letters">{chapter.short}</span><p>CAL POLY IFC CHAPTER</p><h1>{chapter.name}</h1></section><button className="message-chairs" onClick={() => window.location.assign(`/pnm/message?chapter=${encodeURIComponent(chapter.name)}&mark=${encodeURIComponent(chapter.short)}`)}><span>✉</span><div><strong>Message rush chairs</strong><small>Ask a private question about this chapter</small></div><b>→</b></button><section className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h3>Plan your visit</h3></div></section><div className="nfc-note"><span>⌁</span><p>Attendance is only recorded when you scan the NFC tag at the front booth.</p></div><section className="chapter-events">{chapterEvents.map((event) => <article className="chapter-event" key={event.id}><div><span>{event.date}</span><h3>{event.title}</h3><p>◷ {event.time}<br />◉ {event.place}</p></div><button className={scheduled.includes(event.id) ? "added" : "add-event"} onClick={() => addEvent(event.id)}>{scheduled.includes(event.id) ? "✓ Added" : "+ Add"}</button></article>)}</section></div>; }

function PersonalSchedule({ ids, removeEvent }: { ids: string[]; removeEvent: (id: string) => void }) { const scheduledEvents = events.filter((event) => ids.includes(event.id)); return <div className="shell personal-schedule"><section className="greeting"><p className="eyebrow">YOUR RUSH PLAN</p><h1>My schedule</h1><p className="muted">Your selected events in one place.</p></section>{scheduledEvents.length === 0 ? <section className="empty-state"><span>◫</span><h3>Nothing planned yet</h3><p>Explore chapters and add the events you want to attend.</p></section> : <section className="schedule-cards">{scheduledEvents.map((event) => <article className="scheduled-event" key={event.id}><p>{event.date} · {event.chapter}</p><h3>{event.title}</h3><span>◷ {event.time} · ◉ {event.place}</span><div><small>⌁ Check in at the front booth</small><button onClick={() => removeEvent(event.id)}>Remove</button></div></article>)}</section>}<section className="attendance-rule"><span>✓</span><div><strong>How attendance works</strong><p>Adding an event only plans your visit. The NFC tag at the front booth is the only way an event is marked attended.</p></div></section></div>; }

function PnmMessages() { const openChat = (chapter: string, mark: string) => window.location.assign(`/pnm/message?chapter=${encodeURIComponent(chapter)}&mark=${encodeURIComponent(mark)}`); return <div className="shell pnm-messages"><section className="greeting"><p className="eyebrow">PRIVATE CHAPTER CHATS</p><h1>Messages</h1><p className="muted">Your private conversations with chapter rush chairs.</p></section><section className="message-inbox"><button onClick={() => openChat("Alpha Epsilon Pi", "AΕΠ")}><span className="inbox-mark">AΕΠ</span><div><strong>Alpha Epsilon Pi rush chairs</strong><small>Start a conversation</small></div><b className="plane-icon">➤</b></button><button onClick={() => openChat("Phi Delta Theta", "ΦΔΘ")}><span className="inbox-mark">ΦΔΘ</span><div><strong>Phi Delta Theta rush chairs</strong><small>Start a conversation</small></div><b className="plane-icon">➤</b></button></section><p className="inbox-privacy">Chats are private between you and each chapter’s rush chairs.</p></div>; }

function PnmProfile({ profile }: { profile: { name: string; phone: string; photo: string } }) { return <div className="shell pnm-profile"><section className="greeting"><p className="eyebrow">YOUR PNM PROFILE</p><h1>{profile.name}</h1><p className="muted">Keep your details current so chapters can recognize you at events.</p></section><section className="profile-summary">{profile.photo ? <img src={profile.photo} alt="Profile" /> : <span>◌</span>}<div><strong>{profile.name}</strong><small>{profile.phone}</small></div></section></div>; }

