"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chapters, chapterNames } from "@/lib/chapters";
import { isProfileDto, PROFILE_ROLES, type ProfileRole } from "@/lib/profile-domain";

type ProfileForm = {
  fullName: string;
  phone: string;
  hometown: string;
  major: string;
  funnyQuestionAnswer: string;
  photo: File | null;
};

const emptyForm: ProfileForm = {
  fullName: "",
  phone: "",
  hometown: "",
  major: "",
  funnyQuestionAnswer: "",
  photo: null,
};

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
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

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (!isProfileDto(value)) return;
        if (!active) return;
        if (!isSwitching) {
          router.replace(landingPath(value.role));
          return;
        }
        setForm({ fullName: value.full_name, phone: value.phone, hometown: value.hometown ?? "", major: value.major ?? "", funnyQuestionAnswer: value.funny_question_answer ?? "", photo: null });
        setPhotoPreview(value.photo_url ?? "");
        setChapter(value.associated_houses[0] ?? selectedChapter);
      } catch {
        if (active) setError("Could not load your saved profile. You can still enter your details again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, [router]);

  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0] ?? null;
    if (!photo) return;
    setForm((current) => ({ ...current, photo }));
    setPhotoPreview(URL.createObjectURL(photo));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      setError("Choose a valid profile role from the welcome page.");
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
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Could not save your profile.";
        setError(message);
        return;
      }
      if (role === "IFC Admin") router.push("/member?role=IFC%20Admin");
      else router.push(`/member?chair=${role === "Rush Chair" ? "yes" : "no"}`);
    } catch {
      setError("Could not save your profile. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="cal-poly-app onboarding">
    <section className="onboarding-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><span>FALL RUSH ’26</span></section>
    <section className="onboarding-body">
      <p className="eyebrow">{role?.toUpperCase() ?? "PROFILE SETUP"}</p>
      <h1>Complete your<br />profile.</h1>
      <p>These details will be saved to your Rush profile.</p>
      {loading ? <p>Loading your saved profile…</p> : !role ? <p role="alert">This profile role is not recognized. Return to the welcome page and choose a role.</p> : <form onSubmit={submit}>
        <label>Full name<input autoFocus required minLength={2} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="e.g. Henry Mitchell" /></label>
        <label>Mobile number<input required type="tel" inputMode="tel" pattern="\+[1-9][0-9]{7,14}" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+13428765643" /></label>
        <label>Hometown <span>(optional)</span><input value={form.hometown} onChange={(event) => setForm({ ...form, hometown: event.target.value })} placeholder="e.g. San Francisco" /></label>
        <label>Major <span>(optional)</span><input value={form.major} onChange={(event) => setForm({ ...form, major: event.target.value })} placeholder="e.g. Computer Science" /></label>
        {(role === "Active Member" || role === "Rush Chair") && <section className="profile-chapter-picker" aria-labelledby="profile-chapter-heading">
          <div><p className="eyebrow">YOUR CHAPTER</p><h2 id="profile-chapter-heading">Choose your chapter.</h2><p>This connects your profile to the right member and rush-chair workspace.</p></div>
          <div className="chapter-grid" role="list" aria-label="Choose your chapter">{chapters.map((candidate) => {
            const selected = chapter === candidate.name;
            return <button key={candidate.name} type="button" role="listitem" aria-pressed={selected} className={`chapter-tile chapter-letter-tile${selected ? " selected" : ""}`} onClick={() => { setChapter(candidate.name); setError(""); }} style={{ "--chapter": candidate.colors[0], "--chapter-accent": candidate.colors[1] } as React.CSSProperties}><span className="tile-letters">{candidate.short}</span><strong>{candidate.name}</strong><small>{selected ? "Selected" : "Choose chapter"} <b>{selected ? "✓" : "→"}</b></small></button>;
          })}</div>
        </section>}
        <label className="photo-upload">{photoPreview ? <img src={photoPreview} alt="Profile preview" /> : <span>＋</span>}<input required={!photoPreview} type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} /><b>{photoPreview ? "Change photo" : "Add a photo"}</b></label>
        {error && <p role="alert">{error}</p>}
        <button className="onboarding-next" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile →"}</button>
      </form>}
    </section>
  </main>;
}
