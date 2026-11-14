"use client";

import { ChangeEvent, useState } from "react";

type Chapter = { name: string; short: string; colors: [string, string] };
type RushEvent = { id: string; chapter: string; title: string; date: string; time: string; place: string };

const chapters: Chapter[] = [
  { name: "Alpha Epsilon Pi", short: "AΕΠ", colors: ["#174b3b", "#f4c34f"] }, { name: "Alpha Sigma Phi", short: "ΑΣΦ", colors: ["#214a70", "#ffffff"] },
  { name: "Beta Theta Pi", short: "ΒΘΠ", colors: ["#8a1f2d", "#d8b55b"] }, { name: "Delta Chi", short: "ΔΧ", colors: ["#b12031", "#d9bd7a"] },
  { name: "Delta Sigma Phi", short: "ΔΣΦ", colors: ["#386f94", "#ffffff"] }, { name: "Delta Upsilon", short: "ΔΥ", colors: ["#1d4c86", "#d1af55"] },
  { name: "Kappa Sigma", short: "ΚΣ", colors: ["#a61d32", "#e8c55e"] }, { name: "Lambda Chi Alpha", short: "ΛΧΑ", colors: ["#5b265d", "#e7c96e"] },
  { name: "Phi Delta Theta", short: "ΦΔΘ", colors: ["#29623e", "#ffffff"] }, { name: "Phi Gamma Delta", short: "FIJI", colors: ["#5e266c", "#ffffff"] },
  { name: "Phi Kappa Psi", short: "ΦΚΨ", colors: ["#a82030", "#ffffff"] }, { name: "Phi Sigma Kappa", short: "ΦΣΚ", colors: ["#642c5c", "#e2bd61"] },
  { name: "Pi Kappa Phi", short: "ΠΚΦ", colors: ["#cb3830", "#f3d274"] }, { name: "Sigma Nu", short: "ΣΝ", colors: ["#152f56", "#d0a93f"] },
  { name: "Sigma Phi Epsilon", short: "ΣΦΕ", colors: ["#77252e", "#ffffff"] }, { name: "Sigma Pi", short: "ΣΠ", colors: ["#4c2764", "#e6ce67"] },
  { name: "Theta Chi", short: "ΘΧ", colors: ["#9a2636", "#f0c754"] }, { name: "Zeta Beta Tau", short: "ΖΒΤ", colors: ["#235591", "#ffffff"] },
  { name: "Pi Kappa Alpha", short: "ΠΚΑ", colors: ["#952c38", "#e8c35c"] }
];

const events: RushEvent[] = chapters.flatMap((chapter, index) => [
  { id: `${index}-open`, chapter: chapter.name, title: "Open House", date: `SEP ${10 + (index % 4)}`, time: "7:00 – 9:00 PM", place: `${100 + index} Fraternity Row` },
  { id: `${index}-social`, chapter: chapter.name, title: "Chapter Social", date: `SEP ${12 + (index % 3)}`, time: "5:30 – 7:30 PM", place: `${100 + index} Fraternity Row` }
]);

export default function PnmPortal() {
  const [profile, setProfile] = useState({ name: "", phone: "", photo: "" });
  const [step, setStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<"home" | "chapter" | "schedule">("home");
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [mySchedule, setMySchedule] = useState<string[]>([]);

  if (!isReady) return <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} complete={() => setIsReady(true)} />;

  const selectChapter = (chapter: Chapter) => { setSelectedChapter(chapter); setScreen("chapter"); };
  const addEvent = (id: string) => setMySchedule((current) => current.includes(id) ? current : [...current, id]);
  return <main className="cal-poly-app">
    <header className="cal-poly-header"><div className="brand brand-lockup"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></div><span className="role-label">PNM PORTAL</span><button className="avatar" aria-label="Open profile">{profile.name.slice(0, 2).toUpperCase() || "PN"}</button></header>
    {screen === "home" && <ChapterDirectory name={profile.name} selectChapter={selectChapter} />}
    {screen === "chapter" && selectedChapter && <ChapterEvents chapter={selectedChapter} goBack={() => setScreen("home")} scheduled={mySchedule} addEvent={addEvent} />}
    {screen === "schedule" && <PersonalSchedule ids={mySchedule} removeEvent={(id) => setMySchedule((current) => current.filter((event) => event !== id))} />}
    <nav className="bottom-nav pnm-nav"><button className={screen === "home" ? "nav-active" : ""} onClick={() => setScreen("home")}><span>⌂</span>Chapters</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>My schedule</button><button className="scan" aria-label="NFC check-in"><span>⌁</span></button><button><span>♡</span>Invites</button><button><span>◌</span>Profile</button></nav>
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

function ChapterDirectory({ name, selectChapter }: { name: string; selectChapter: (chapter: Chapter) => void }) { return <div className="shell chapter-directory"><section className="greeting"><div className="greeting-mark"><img src="/brand/cal-poly-cp.png" alt="Cal Poly" /></div><p className="eyebrow">CAL POLY IFC · FALL RUSH ’26</p><h1>Welcome, {name.split(" ")[0]}.</h1><p className="muted">Explore every chapter and build your rush plan.</p></section><section className="directory-note"><span>✦</span><p>Tap a chapter to see its events. Add only the events you plan to attend.</p></section><section className="section-heading"><div><p className="eyebrow">RECOGNIZED CHAPTERS</p><h3>Find your fit</h3></div><span className="chapter-count">{chapters.length}</span></section><section className="chapter-grid">{chapters.map((chapter) => <button className="chapter-tile" key={chapter.name} onClick={() => selectChapter(chapter)}><span className="chapter-monogram" style={{ background: chapter.colors[0], color: chapter.colors[1] }}>{chapter.short}</span><strong>{chapter.name}</strong><small>View events <b>→</b></small></button>)}</section></div>; }

function ChapterEvents({ chapter, goBack, scheduled, addEvent }: { chapter: Chapter; goBack: () => void; scheduled: string[]; addEvent: (id: string) => void }) { const chapterEvents = events.filter((event) => event.chapter === chapter.name); return <div className="shell event-detail"><button className="back-button" onClick={goBack}>← All chapters</button><section className="chapter-detail-hero" style={{ background: chapter.colors[0], color: chapter.colors[1] }}><span className="chapter-monogram large" style={{ borderColor: chapter.colors[1], color: chapter.colors[1] }}>{chapter.short}</span><p>CAL POLY IFC CHAPTER</p><h1>{chapter.name}</h1></section><section className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h3>Plan your visit</h3></div></section><div className="nfc-note"><span>⌁</span><p>Attendance is only recorded when you scan the NFC tag at the chapter’s front booth.</p></div><section className="chapter-events">{chapterEvents.map((event) => <article className="chapter-event" key={event.id}><div><span>{event.date}</span><h3>{event.title}</h3><p>◷ {event.time}<br />◉ {event.place}</p></div><button className={scheduled.includes(event.id) ? "added" : "add-event"} onClick={() => addEvent(event.id)}>{scheduled.includes(event.id) ? "✓ Added" : "+ Add"}</button></article>)}</section></div>; }

function PersonalSchedule({ ids, removeEvent }: { ids: string[]; removeEvent: (id: string) => void }) { const scheduledEvents = events.filter((event) => ids.includes(event.id)); return <div className="shell personal-schedule"><section className="greeting"><p className="eyebrow">YOUR RUSH PLAN</p><h1>My schedule</h1><p className="muted">Your selected events in one place.</p></section>{scheduledEvents.length === 0 ? <section className="empty-state"><span>◫</span><h3>Nothing planned yet</h3><p>Explore chapters and add the events you want to attend.</p></section> : <section className="schedule-cards">{scheduledEvents.map((event) => <article className="scheduled-event" key={event.id}><p>{event.date} · {event.chapter}</p><h3>{event.title}</h3><span>◷ {event.time} · ◉ {event.place}</span><div><small>⌁ Check in at the front booth</small><button onClick={() => removeEvent(event.id)}>Remove</button></div></article>)}</section>}<section className="attendance-rule"><span>✓</span><div><strong>How attendance works</strong><p>Adding an event only plans your visit. The NFC tag at the front booth is the only way an event is marked attended.</p></div></section></div>; }

