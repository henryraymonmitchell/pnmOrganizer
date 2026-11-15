"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chapterNames } from "@/lib/chapters";
import { FUNNY_QUESTION_PROMPT, isProfileDto, PROFILE_ROLES, type ProfileRole } from "@/lib/profile-domain";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get("role");
    const selectedRole = PROFILE_ROLES.find((candidate) => candidate === requestedRole) ?? null;
    const selectedChapter = params.get("chapter") ?? "";
    setRole(selectedRole);
    setChapter(selectedChapter);

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (!isProfileDto(value)) return;
        if (!active) return;
        router.replace(landingPath(value.role));
        return;
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
    setSaving(true);
    setError("");
    const houses = role === "IFC Admin" ? chapterNames : chapter ? [chapter] : [];
    const body = new FormData();
    body.set("role", role);
    body.set("full_name", form.fullName);
    body.set("phone", form.phone);
    body.set("hometown", form.hometown);
    body.set("major", form.major);
    body.set("funny_question_answer", form.funnyQuestionAnswer);
    body.set("associated_houses", JSON.stringify(houses));
    if (form.photo) body.set("photo", form.photo);

    try {
      const response = await fetch("/api/profile", { method: "POST", body });
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

  const associatedHouses = role === "IFC Admin" ? "All recognized houses" : chapter || "Not provided";
  const chapterRequired = role === "Rush Chair" || role === "Active Member";

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
        <label>{FUNNY_QUESTION_PROMPT} <span>(optional)</span><textarea rows={3} value={form.funnyQuestionAnswer} onChange={(event) => setForm({ ...form, funnyQuestionAnswer: event.target.value })} /></label>
        {role !== "IFC Admin" && <label>Your chapter {!chapterRequired && <span>(optional)</span>}<select required={chapterRequired} value={chapter} onChange={(event) => setChapter(event.target.value)}><option value="">{chapterRequired ? "Choose your chapter" : "Choose later"}</option>{chapterNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
        <section className="directory-note"><strong>Associated houses <span>(optional)</span></strong><p>{associatedHouses}</p></section>
        <label className="photo-upload">{photoPreview ? <img src={photoPreview} alt="Profile preview" /> : <span>＋</span>}<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} /><b>{photoPreview ? "Change photo" : "Add a photo"}</b></label>
        {error && <p role="alert">{error}</p>}
        <button className="onboarding-next" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile →"}</button>
      </form>}
    </section>
  </main>;
}
