"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthSessionDto } from "@/lib/auth-domain";
import { chapters, chapterNames } from "@/lib/chapters";
import { isProfileDto, PROFILE_ROLES, type ProfileRole } from "@/lib/profile-domain";

type ProfileForm = {
  fullName: string;
  phone: string;
  hometown: string;
  major: string;
  photo: File | null;
};

const emptyForm: ProfileForm = { fullName: "", phone: "", hometown: "", major: "", photo: null };
const phonePattern = /^\+[1-9]\d{7,14}$/;

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
}

function apiError(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

export default function ProfileSetup() {
  const router = useRouter();
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [chapter, setChapter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState("");
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get("role");
    const selectedRole = PROFILE_ROLES.find((candidate) => candidate === requestedRole) ?? null;
    const selectedChapter = params.get("chapter") ?? "";
    const isSwitching = params.get("switch") === "1";
    setRole(selectedRole);
    setChapter(selectedChapter);
    setSwitchingAccount(isSwitching);

    async function loadSetup() {
      try {
        const [sessionResponse, profileResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        const session: unknown = sessionResponse.ok ? await sessionResponse.json() : null;
        const profile: unknown = profileResponse.ok ? await profileResponse.json() : null;
        if (!active) return;
        if (!isAuthSessionDto(session) || !session.email_verified) {
          setError("Sign in with your Cal Poly email before completing a profile.");
          return;
        }
        if (session.phone) setForm((current) => ({ ...current, phone: session.phone! }));
        setPhoneVerified(session.phone_verified);
        if (isProfileDto(profile)) {
          if (!isSwitching) {
            router.replace(landingPath(profile.role));
            return;
          }
          setForm({ fullName: profile.full_name, phone: session.phone ?? profile.phone, hometown: profile.hometown ?? "", major: profile.major ?? "", photo: null });
          setPhotoPreview(profile.photo_url ?? "");
          setChapter(profile.associated_houses[0] ?? selectedChapter);
        }
      } catch {
        if (active) setError("Could not load your sign-in session. Please sign in again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSetup();
    return () => { active = false; };
  }, [router]);

  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0] ?? null;
    if (!photo) return;
    setForm((current) => ({ ...current, photo }));
    setPhotoPreview(URL.createObjectURL(photo));
  };

  const sendPhoneCode = async () => {
    if (!phonePattern.test(form.phone.trim()) || phoneBusy) {
      setError("Enter a phone number in international format, such as +13428765643.");
      return;
    }
    setPhoneBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim() }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(result, "Could not send a phone confirmation code."));
      setPhoneCodeSent(true);
      setPhoneCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send a phone confirmation code.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!phoneCode.trim() || phoneBusy) return;
    setPhoneBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim(), code: phoneCode.trim() }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(result, "Could not verify that phone code."));
      setPhoneVerified(true);
      setPhoneCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not verify that phone code.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      setError("Choose a valid profile role from the welcome page.");
      return;
    }
    if (!phoneVerified) {
      setError("Verify your phone number before saving your profile.");
      return;
    }
    const requiresChapter = role === "Active Member" || role === "Rush Chair";
    if (requiresChapter && !chapter) {
      setError("Choose your chapter before completing your profile.");
      return;
    }
    setSaving(true);
    setError("");
    const houses = role === "IFC Admin" ? chapterNames : chapter ? [chapter] : [];
    const body = new FormData();
    body.set("role", role);
    body.set("full_name", form.fullName);
    body.set("phone", form.phone);
    body.set("hometown", form.hometown);
    body.set("major", form.major);
    body.set("funny_question_answer", "");
    body.set("associated_houses", JSON.stringify(houses));
    if (form.photo) body.set("photo", form.photo);

    try {
      const response = await fetch("/api/profile", { method: switchingAccount ? "PATCH" : "POST", body });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(result, "Could not save your profile."));
      if (role === "IFC Admin") router.push("/member?role=IFC%20Admin");
      else router.push(`/member?chair=${role === "Rush Chair" ? "yes" : "no"}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your profile. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="cal-poly-app onboarding"><section className="onboarding-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><span>FALL RUSH ’26</span></section><section className="onboarding-body"><p className="eyebrow">{role?.toUpperCase() ?? "PROFILE SETUP"}</p><h1>Complete your<br />profile.</h1><p>These details will be saved to your verified Rush profile.</p>{loading ? <p>Loading your sign-in session…</p> : !role ? <p role="alert">This profile role is not recognized. Return to the welcome page and choose a role.</p> : <form onSubmit={submit}><label>Full name<input autoFocus required minLength={2} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="e.g. Henry Mitchell" /></label><label>Mobile number<input required type="tel" inputMode="tel" pattern="\+[1-9][0-9]{7,14}" value={form.phone} disabled={phoneCodeSent && !phoneVerified} onChange={(event) => { setForm({ ...form, phone: event.target.value }); setPhoneVerified(false); setPhoneCodeSent(false); setPhoneCode(""); }} placeholder="+13428765643" /></label>{phoneVerified ? <p className="verification-status" role="status">✓ Phone number confirmed</p> : phoneCodeSent ? <><label>Text confirmation code<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} placeholder="Enter code" /></label><button className="secondary-action" type="button" disabled={phoneBusy || !phoneCode.trim()} onClick={() => void verifyPhoneCode()}>{phoneBusy ? "Verifying…" : "Verify phone code"}</button></> : <button className="secondary-action" type="button" disabled={phoneBusy || !phonePattern.test(form.phone.trim())} onClick={() => void sendPhoneCode()}>{phoneBusy ? "Sending…" : "Send text confirmation"}</button>}<label>Hometown <span>(optional)</span><input value={form.hometown} onChange={(event) => setForm({ ...form, hometown: event.target.value })} placeholder="e.g. San Francisco" /></label><label>Major <span>(optional)</span><input value={form.major} onChange={(event) => setForm({ ...form, major: event.target.value })} placeholder="e.g. Computer Science" /></label>{(role === "Active Member" || role === "Rush Chair") && <section className="profile-chapter-picker" aria-labelledby="profile-chapter-heading"><div><p className="eyebrow">YOUR CHAPTER</p><h2 id="profile-chapter-heading">Choose your chapter.</h2><p>This connects your profile to the right member and rush-chair workspace.</p></div><div className="chapter-grid" role="list" aria-label="Choose your chapter">{chapters.map((candidate) => { const selected = chapter === candidate.name; return <button key={candidate.name} type="button" role="listitem" aria-pressed={selected} className={`chapter-tile chapter-letter-tile${selected ? " selected" : ""}`} onClick={() => { setChapter(candidate.name); setError(""); }} style={{ "--chapter": candidate.colors[0], "--chapter-accent": candidate.colors[1] } as React.CSSProperties}><span className="tile-letters">{candidate.short}</span><strong>{candidate.name}</strong><small>{selected ? "Selected" : "Choose chapter"} <b>{selected ? "✓" : "→"}</b></small></button>; })}</div></section>}<label className="photo-upload">{photoPreview ? <img src={photoPreview} alt="Profile preview" /> : <span>＋</span>}<input required={!photoPreview} type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} /><b>{photoPreview ? "Change photo" : "Add a photo"}</b></label>{error && <p role="alert">{error}</p>}<button className="onboarding-next" type="submit" disabled={saving || !phoneVerified}>{saving ? "Saving…" : "Save profile →"}</button></form>}<button className="text-button" type="button" onClick={() => router.push("/")}>Back to sign in</button></section></main>;
}
