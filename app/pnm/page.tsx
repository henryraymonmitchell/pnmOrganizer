"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { isAuthSessionDto } from "@/lib/auth-domain";
import { chapters as fallbackChapters, type Chapter } from "@/lib/chapters";
import { isProfileDto } from "@/lib/profile-domain";
import { isRushEventList, type RushEventDto } from "@/lib/rush-domain";

type PnmProfileData = { name: string; phone: string; photo: string; photoFile?: File; hometown: string; major: string; associatedHouses: string[]; funnyQuestionAnswer: string };

const chapters = fallbackChapters;

function eventDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function eventTime(event: RushEventDto) {
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${new Date(event.starts_at).toLocaleTimeString("en-US", options)} – ${new Date(event.ends_at).toLocaleTimeString("en-US", options)}`;
}

function eventTitle(event: RushEventDto) {
  return event.event_type.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function apiError(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

export default function PnmPortal() {
  const [profile, setProfile] = useState<PnmProfileData>({ name: "", phone: "", photo: "", hometown: "", major: "", associatedHouses: [], funnyQuestionAnswer: "" });
  const [step, setStep] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<"home" | "chapter" | "schedule" | "messages" | "profile">("home");
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [events, setEvents] = useState<RushEventDto[]>([]);
  const [eventError, setEventError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>(fallbackChapters);
  const [chapterLoadError, setChapterLoadError] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("screen") === "messages") setScreen("messages");
  }, []);

  useEffect(() => {
    let active = true;
    const isSwitching = new URLSearchParams(window.location.search).get("switch") === "1";
    async function restoreProfile() {
      try {
        const [sessionResponse, response] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        const session: unknown = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!isAuthSessionDto(session) || !session.email_verified) {
          window.location.replace("/");
          return;
        }
        if (response.ok) {
          const value: unknown = await response.json();
          if (!isProfileDto(value)) return;
          const data = value;
          if (data.role !== "PNM" && !isSwitching) {
            window.location.replace(data.role === "Rush Chair" ? "/member?chair=yes" : data.role === "IFC Admin" ? "/member?role=IFC%20Admin" : "/member?chair=no");
            return;
          }
          if (active && (data.role === "PNM" || isSwitching)) {
            setProfile({
              name: data.full_name,
              phone: data.phone,
              photo: data.photo_url ?? "",
              hometown: data.hometown ?? "",
              major: data.major ?? "",
              associatedHouses: data.associated_houses,
              funnyQuestionAnswer: data.funny_question_answer ?? "",
            });
            if (data.role === "PNM" && data.email_verified_at && data.phone_verified_at) setIsReady(true);
          }
        }
      } catch {
        // A missing local profile starts a new onboarding session.
      } finally {
        if (active) setProfileLoaded(true);
      }
    }
    void restoreProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      if (!isReady) return;
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        const value: unknown = await response.json();
        if (!response.ok || !isRushEventList(value)) throw new Error("Could not load saved events.");
        if (active) {
          setEvents(value);
          setEventError(null);
        }
      } catch {
        if (active) setEventError("Could not load saved events. Please refresh to try again.");
      }
    }
    void loadEvents();
    return () => { active = false; };
  }, [isReady]);

  const saveProfile = async () => {
    setOnboardingError(null);
    const photoFile = profile.photoFile;
    if (!photoFile && !profile.photo) {
      setOnboardingError("Please choose a profile photo.");
      return;
    }

    const form = new FormData();
    form.set("role", "PNM");
    form.set("full_name", profile.name);
    form.set("phone", profile.phone);
    form.set("hometown", profile.hometown);
    form.set("major", profile.major);
    form.set("funny_question_answer", "");
    form.set("associated_houses", JSON.stringify(profile.associatedHouses));
    if (photoFile) form.set("photo", photoFile);
    const response = await fetch("/api/profile", { method: "POST", body: form });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
        ? result.error
        : "Could not save your profile.";
      setOnboardingError(message);
      return;
    }
    if (!isProfileDto(result)) {
      setOnboardingError("The saved profile response was invalid.");
      return;
    }
    const saved = result;
    setProfile({ ...profile, photo: saved.photo_url ?? "", photoFile: undefined });
    setIsReady(true);
  };

  const saveProfileDetails = async (details: Pick<PnmProfileData, "hometown" | "major" | "associatedHouses" | "funnyQuestionAnswer">) => {
    const nextProfile = { ...profile, ...details };
    const form = new FormData();
    form.set("role", "PNM");
    form.set("full_name", nextProfile.name);
    form.set("phone", nextProfile.phone);
    form.set("hometown", nextProfile.hometown);
    form.set("major", nextProfile.major);
    form.set("funny_question_answer", "");
    form.set("associated_houses", JSON.stringify(nextProfile.associatedHouses));
    try {
      const response = await fetch("/api/profile", { method: "PATCH", body: form });
      if (!response.ok) return false;
      setProfile(nextProfile);
      void refreshEvents();
      return true;
    } catch {
      return false;
    }
  };

  const refreshEvents = async () => {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const value: unknown = await response.json();
      if (!response.ok || !isRushEventList(value)) throw new Error("Could not load saved events.");
      setEvents(value);
      setEventError(null);
      return true;
    } catch {
      setEventError("Could not load saved events. Please refresh to try again.");
      return false;
    }
  };

  const selectChapter = async (chapter: Chapter) => {
    if (!profile.associatedHouses.includes(chapter.name)) {
      const saved = await saveProfileDetails({
        hometown: profile.hometown,
        major: profile.major,
        associatedHouses: [...profile.associatedHouses, chapter.name],
        funnyQuestionAnswer: profile.funnyQuestionAnswer,
      });
      if (!saved) {
        setEventError("Could not save this chapter to your profile. Please try again.");
        return;
      }
    }
    await refreshEvents();
    setSelectedChapter(chapter);
    setScreen("chapter");
  };

  const signUpForEvent = async (event: RushEventDto) => {
    setEventError(null);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(event.id)}/signup`, { method: "POST" });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Could not sign up for this event.";
        setEventError(message);
        return;
      }
      await refreshEvents();
    } catch {
      setEventError("Could not sign up for this event. Please try again.");
    }
  };

  const cancelEventSignup = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}/signup`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not cancel sign-up.");
      await refreshEvents();
    } catch {
      setEventError("Could not cancel sign-up. Please try again.");
    }
  };

  const switchProfile = () => window.location.assign("/?switch=1");

  useEffect(() => {
    let active = true;
    async function loadChapters() {
      try {
        const response = await fetch("/api/chapters", { cache: "no-store" });
        const value: unknown = await response.json();
        if (!response.ok || !Array.isArray(value) || !value.every((name) => typeof name === "string")) {
          throw new Error("Could not load chapters.");
        }
        const knownChapters = new Map(fallbackChapters.map((chapter) => [chapter.name, chapter]));
        const savedChapters = value.map((name) => knownChapters.get(name)).filter((chapter): chapter is Chapter => Boolean(chapter));
        if (!active) return;
        if (!savedChapters.length) throw new Error("The local chapter list is empty.");
        setChapters(savedChapters);
        setChapterLoadError(null);
      } catch {
        if (active) setChapterLoadError("Could not load the local chapter list. Showing saved demo chapters.");
      }
    }

    void loadChapters();
    return () => { active = false; };
  }, []);

  if (!profileLoaded) return <main className="cal-poly-app onboarding"><section className="onboarding-body"><p>Loading your saved profile…</p></section></main>;
  if (!isReady) return <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} complete={saveProfile} error={onboardingError} />;

  const chapterStyle = selectedChapter ? { "--chapter": selectedChapter.colors[0], "--chapter-accent": selectedChapter.colors[1] } as React.CSSProperties : undefined;
  return <main className={`cal-poly-app${screen === "chapter" ? " chapter-portal" : ""}`} style={chapterStyle}>
    <header className="cal-poly-header"><button className="brand brand-lockup home-logo" onClick={() => setScreen("home")} aria-label="Back to all chapters"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></button><span className="role-label">PNM PORTAL</span><button className="avatar" onClick={() => setScreen("profile")} aria-label="Open profile">{profile.name.slice(0, 2).toUpperCase() || "PN"}</button></header>
    {eventError && <p role="alert" className="directory-note">{eventError}</p>}
    {screen === "home" && <ChapterDirectory name={profile.name} selectChapter={selectChapter} loadError={chapterLoadError} />}
    {screen === "chapter" && selectedChapter && <ChapterEvents chapter={selectedChapter} goBack={() => setScreen("home")} events={events} signUp={signUpForEvent} />}
    {screen === "schedule" && <PersonalSchedule events={events} removeEvent={cancelEventSignup} />}
    {screen === "messages" && <PnmMessages events={events} availableChapters={chapters} />}
    {screen === "profile" && <PnmProfile profile={profile} saveDetails={saveProfileDetails} switchProfile={switchProfile} />}
    <nav className="bottom-nav pnm-nav"><button className={screen === "home" ? "nav-active" : ""} onClick={() => setScreen("home")}><span>⌂</span>Home</button><button className={screen === "schedule" ? "nav-active" : ""} onClick={() => setScreen("schedule")}><span>◫</span>My schedule</button><button className={screen === "messages" ? "nav-active" : ""} onClick={() => setScreen("messages")}><span className="plane-icon">➤</span>Messages</button><button className={screen === "profile" ? "nav-active" : ""} onClick={() => setScreen("profile")}><span>◌</span>Profile</button></nav>
  </main>;
}

function Onboarding({ profile, setProfile, step, setStep, complete, error }: { profile: PnmProfileData; setProfile: (profile: PnmProfileData) => void; step: number; setStep: (step: number) => void; complete: () => void; error: string | null }) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => { const photoFile = event.target.files?.[0]; if (photoFile) setProfile({ ...profile, photoFile, photo: URL.createObjectURL(photoFile) }); };
  const canContinue = step === 0
    ? profile.name.trim().length > 1
    : step === 1
      ? codeSent ? code.length >= 4 : /^\+[1-9]\d{7,14}$/.test(profile.phone.trim())
      : step === 2 || Boolean(profile.photoFile || profile.photo);
  const continueOnboarding = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      if (step === 1 && !codeSent) {
        const response = await fetch("/api/auth/phone/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: profile.phone.trim() }),
        });
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(apiError(result, "Could not send a phone confirmation code."));
        setCodeSent(true);
      } else if (step === 1) {
        const response = await fetch("/api/auth/phone/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: profile.phone.trim(), code }),
        });
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(apiError(result, "Could not verify that phone code."));
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        await complete();
      } else {
        setStep(step + 1);
      }
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Could not continue. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return <main className="cal-poly-app onboarding"><section className="onboarding-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><span>FALL RUSH ’26</span></section><section className="onboarding-body"><div className="step-indicator"><b className={step >= 0 ? "done" : ""}></b><b className={step >= 1 ? "done" : ""}></b><b className={step >= 2 ? "done" : ""}></b><b className={step >= 3 ? "done" : ""}></b></div>
    {step === 0 && <><p className="eyebrow">STEP 1 OF 4</p><h1>What should we<br />call you?</h1><p>Start with your name so every chapter can welcome you personally.</p><label>Your full name<input autoFocus value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="e.g. Maya Rodriguez" /></label></>}
    {step === 1 && <><p className="eyebrow">STEP 2 OF 4</p><h1>{codeSent ? "Verify your\nphone number." : "Your phone\nnumber."}</h1><p>{codeSent ? `Enter the code sent to ${profile.phone}.` : "Use international format, for example +18055550123."}</p><label>Mobile number<input autoFocus inputMode="tel" value={profile.phone} disabled={codeSent} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+18055550123" /></label>{codeSent && <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} /></label>}<small>By continuing, you agree to receive IFC rush texts. You can opt out anytime.</small></>}
    {step === 2 && <><p className="eyebrow">STEP 3 OF 4</p><h1>A little more<br />about you.</h1><label>Hometown <span>(optional)</span><input value={profile.hometown} onChange={(event) => setProfile({ ...profile, hometown: event.target.value })} placeholder="e.g. San Francisco" /></label><label>Major <span>(optional)</span><input value={profile.major} onChange={(event) => setProfile({ ...profile, major: event.target.value })} placeholder="e.g. Computer Science" /></label></>}
    {step === 3 && <><p className="eyebrow">STEP 4 OF 4</p><h1>Add a clear<br />photo of you.</h1><p>It helps chapters recognize you at their front booth—so check-in stays quick.</p><label className="photo-upload">{profile.photo ? <img src={profile.photo} alt="Profile preview" /> : <span>＋</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} /><b>{profile.photo ? "Change photo" : "Choose a photo"}</b></label></>}
    {(localError || error) && <p role="alert">{localError || error}</p>}<button className="onboarding-next" disabled={!canContinue || busy} onClick={continueOnboarding}>{busy ? "Please wait…" : step === 3 ? "Save profile →" : step === 1 && codeSent ? "Verify code →" : "Continue →"}</button>
  </section></main>;
}

function ChapterDirectory({ name, selectChapter, loadError }: { name: string; selectChapter: (chapter: Chapter) => void; loadError: string | null }) { return <div className="shell chapter-directory"><section className="greeting"><div className="greeting-mark"><img src="/brand/cal-poly-cp.png" alt="Cal Poly" /></div><p className="eyebrow">CAL POLY IFC · FALL RUSH ’26</p><h1>Welcome, {name.split(" ")[0]}.</h1><p className="muted">Choose a chapter to add it to your rush profile and view its events.</p></section>{loadError && <p role="status" className="directory-note">{loadError}</p>}<section className="directory-note"><span>✦</span><p>Selecting a chapter starts your open invite progress there. Sign up for an event to add it to My schedule.</p></section><section className="section-heading"><div><p className="eyebrow">RECOGNIZED CHAPTERS</p><h3>Find your fit</h3></div><span className="chapter-count">{chapters.length}</span></section><section className="chapter-grid">{chapters.map((chapter) => <button className="chapter-tile chapter-letter-tile" key={chapter.name} onClick={() => selectChapter(chapter)} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}><span className="tile-letters">{chapter.short}</span><strong>{chapter.name}</strong><small>View events <b>→</b></small></button>)}</section></div>; }

function ChapterEvents({ chapter, goBack, events, signUp }: { chapter: Chapter; goBack: () => void; events: RushEventDto[]; signUp: (event: RushEventDto) => void }) {
  const chapterEvents = events.filter((event) => event.chapter_name === chapter.name);
  return <div className="shell event-detail chapter-theme" style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}><button className="back-button" onClick={goBack}>← All chapters</button><section className="chapter-detail-hero"><span className="chapter-display-letters">{chapter.short}</span><p>CAL POLY IFC CHAPTER</p><h1>{chapter.name}</h1></section><button className="message-chairs" onClick={() => window.location.assign(`/pnm/message?chapter=${encodeURIComponent(chapter.name)}&mark=${encodeURIComponent(chapter.short)}`)}><img className="rush-chair-photo" src="/brand/rush-chair.jpg" alt="Rush chair" /><div><strong>Message rush chairs</strong><small>Ask a private question about this chapter</small></div><b>→</b></button><section className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h3>Plan your visit</h3></div></section><div className="nfc-note"><span>⌁</span><p>Attendance is only recorded when you scan the NFC tag at the front booth.</p></div>{chapterEvents.length ? <section className="chapter-events">{chapterEvents.map((event) => <article className="chapter-event" key={event.id}><div><span>{eventDate(event.starts_at)}</span><h3>{eventTitle(event)}</h3><p>◷ {eventTime(event)}<br />◉ {event.address}</p></div><button className={event.signed_up ? "added" : "add-event"} onClick={() => signUp(event)} disabled={event.signed_up}>{event.signed_up ? "✓ Signed up" : "+ Sign up"}</button></article>)}</section> : <section className="empty-state"><span>◫</span><h3>No events scheduled</h3><p>Check back when this chapter posts its next event.</p></section>}</div>;
}

function PersonalSchedule({ events, removeEvent }: { events: RushEventDto[]; removeEvent: (id: string) => void }) {
  const [selectedEvent, setSelectedEvent] = useState<RushEventDto | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const scheduledEvents = events.filter((event) => event.signed_up).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const scheduledDates = Array.from(new Set(scheduledEvents.map((event) => eventDate(event.starts_at))));
  const selectedChapter = selectedEvent ? chapters.find((chapter) => chapter.name === selectedEvent.chapter_name) : null;

  const scanNfcTag = async () => {
    type NfcReader = { scan: () => Promise<void>; addEventListener: (type: "reading", listener: () => void, options?: { once?: boolean }) => void };
    const NdefReader = (window as typeof window & { NDEFReader?: new () => NfcReader }).NDEFReader;
    if (!NdefReader) {
      setNfcStatus("NFC scanning is available on supported mobile browsers. Ask the front booth for help checking in.");
      return;
    }
    try {
      const reader = new NdefReader();
      await reader.scan();
      setNfcStatus("Ready to scan — hold your phone near the NFC tag.");
      reader.addEventListener("reading", () => setNfcStatus("Tag scanned. Attendance validation is not connected in this demo."), { once: true });
    } catch {
      setNfcStatus("We couldn’t start the NFC scanner. Please allow NFC access and try again.");
    }
  };

  return <div className="shell personal-schedule">
    <section className="greeting"><p className="eyebrow">YOUR RUSH PLAN</p><h1>My schedule</h1><p className="muted">Tap an event for its address and Maps link.</p></section>
    {scheduledEvents.length === 0 ? <section className="empty-state"><span>◫</span><h3>Nothing planned yet</h3><p>Explore chapters and sign up for the events you want to attend.</p></section> : <section className="schedule-days">
      {scheduledDates.map((date, dateIndex) => {
        const dayEvents = scheduledEvents.filter((event) => eventDate(event.starts_at) === date);
        const dayName = new Date(dayEvents[0].starts_at).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
        const dayLabel = dateIndex === 0 ? "UPCOMING EVENTS" : dateIndex === 1 ? "NEXT DAY" : "UPCOMING DAY";
        return <section className="today-events" key={date}>
          <header className="today-events-header"><div><p className="eyebrow">{dayLabel}</p><h2>{dayName} · {date}</h2></div><span>{dayEvents.length} signed up</span></header>
          <div className="today-event-list">{dayEvents.map((event) => {
            const chapter = chapters.find((item) => item.name === event.chapter_name);
            if (!chapter) return null;
            return <article className="today-event-row" key={event.id} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}>
              <button className="today-event-card" onClick={() => setSelectedEvent(event)} aria-label={`${chapter.name} ${eventTitle(event)}, ${eventTime(event)}. View details.`}>
                <span className="today-event-mark">{chapter.short}</span><span className="today-event-copy"><small>{chapter.name}</small><strong>{eventTitle(event)}</strong><em>◷ {eventTime(event)}</em></span><b>›</b>
              </button>
              <button className="remove-scheduled-event" type="button" onClick={() => removeEvent(event.id)} aria-label={`Cancel ${eventTitle(event)} sign-up`}>Cancel</button>
            </article>;
          })}</div>
        </section>;
      })}
    </section>}
    <section className="attendance-rule"><span>✓</span><div><strong>How attendance works</strong><p>Signing up reserves your place. NFC attendance validation is not connected in this demo.</p></div></section>
    {selectedEvent && selectedChapter && <div className="event-location-overlay" role="dialog" aria-modal="true" aria-label="Event location"><section className="event-location-sheet" style={{ "--chapter": selectedChapter.colors[0], "--chapter-accent": selectedChapter.colors[1] } as React.CSSProperties}>
      <button className="sheet-close" onClick={() => setSelectedEvent(null)} aria-label="Close location">×</button><span className="location-mark">{selectedChapter.short}</span><p className="eyebrow">{selectedChapter.name.toUpperCase()}</p><h2>{eventTitle(selectedEvent)}</h2><p>◷ {eventTime(selectedEvent)}</p><a className="event-address event-map-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address)}`} target="_blank" rel="noreferrer">⌖ {selectedEvent.address}<span>Open in Maps ↗</span></a>
      <button className="nfc-check-in" type="button" onClick={scanNfcTag}>⌁ Scan NFC tag to check in</button>{nfcStatus && <p className="nfc-scan-status" role="status">{nfcStatus}</p>}
    </section></div>}
  </div>;
}

function PnmMessages({ events, availableChapters }: { events: RushEventDto[]; availableChapters: Chapter[] }) {
  const openChat = (chapter: string, mark: string) => window.location.assign(`/pnm/message?chapter=${encodeURIComponent(chapter)}&mark=${encodeURIComponent(mark)}`);
  const chatChapters = Array.from(new Set(events.filter((event) => event.signed_up).map((event) => event.chapter_name)))
    .map((name) => availableChapters.find((chapter) => chapter.name === name))
    .filter((chapter): chapter is Chapter => Boolean(chapter));
  return <div className="shell pnm-messages">
    <section className="greeting"><p className="eyebrow">PRIVATE CHAPTER CHATS</p><h1>Messages</h1><p className="muted">Message the rush chairs for chapters on your schedule.</p></section>
    {chatChapters.length > 0 ? <section className="message-inbox">
      {chatChapters.map((chapter) => <button className="chapter-chat-tile" key={chapter.name} onClick={() => openChat(chapter.name, chapter.short)} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as React.CSSProperties}>
        <span className="inbox-mark">{chapter.short}</span><div><strong>{chapter.name} rush chairs</strong><small>Start a conversation</small></div><b className="plane-icon">➤</b>
      </button>)}
    </section> : <section className="empty-state message-empty"><span>✦</span><h3>No chapter chats yet</h3><p>Add an event to your schedule to message that chapter’s rush chairs.</p></section>}
    <p className="inbox-privacy">Chats are private between you and each chapter’s rush chairs.</p>
  </div>;
}

function PnmProfile({ profile, saveDetails, switchProfile }: { profile: PnmProfileData; saveDetails: (details: Pick<PnmProfileData, "hometown" | "major" | "associatedHouses" | "funnyQuestionAnswer">) => Promise<boolean>; switchProfile: () => void }) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [hometown, setHometown] = useState(profile.hometown);
  const [major, setMajor] = useState(profile.major);
  const [detailsStatus, setDetailsStatus] = useState("");

  useEffect(() => {
    setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);
  useEffect(() => {
    setHometown(profile.hometown);
    setMajor(profile.major);
  }, [profile.hometown, profile.major]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/notification-sw.js");
    setNotificationPermission(await Notification.requestPermission());
  };
  const submitDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDetailsStatus("Saving…");
    setDetailsStatus(await saveDetails({ hometown, major, associatedHouses: profile.associatedHouses, funnyQuestionAnswer: profile.funnyQuestionAnswer }) ? "Saved" : "Could not save. Please try again.");
  };

  const notificationCopy = notificationPermission === "granted"
    ? "Enabled on this device"
    : notificationPermission === "denied"
      ? "Blocked in browser settings"
      : notificationPermission === "unsupported"
        ? "Notifications are not supported in this browser"
        : "Get alerts when a rush chair messages you or an event is about to start.";

  return <div className="shell pnm-profile">
    <section className="greeting"><p className="eyebrow">YOUR PNM PROFILE</p><h1>{profile.name}</h1><p className="muted">Keep your details current so chapters can recognize you at events.</p></section>
    <section className="profile-summary">{profile.photo ? <img src={profile.photo} alt="Profile" /> : <span>◌</span>}<div><strong>{profile.name}</strong><small>{profile.phone}</small></div></section>
    <form className="profile-details" onSubmit={submitDetails}>
      <div className="profile-details-heading"><div><p className="eyebrow">OPTIONAL DETAILS</p><h2>About you</h2></div>{detailsStatus && <span role="status">{detailsStatus}</span>}</div>
      <label>Major<input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Computer Science" /></label>
      <label>Hometown<input value={hometown} onChange={(event) => setHometown(event.target.value)} placeholder="e.g. San Diego, CA" /></label>
      <button type="submit">Save details</button>
    </form>
    <section className="notification-settings">
      <span className="notification-icon">✦</span>
      <div><strong>Live notifications</strong><p>{notificationCopy}</p></div>
      <button type="button" onClick={enableNotifications} disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}>
        {notificationPermission === "granted" ? "On" : notificationPermission === "denied" ? "Blocked" : "Enable"}
      </button>
    </section>
    <section className="profile-account-actions"><button type="button" onClick={switchProfile}>Switch account type</button><button className="logout-button" type="button" onClick={async () => { await fetch("/api/profile", { method: "DELETE" }); window.location.assign("/"); }}>Log out</button></section>
  </div>;
}

