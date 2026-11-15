"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chapters } from "@/lib/chapters";
import { isProfileDto, type ProfileRole } from "@/lib/profile-domain";

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
}

export default function MemberChapterSelection() {
  const router = useRouter();
  const [checkingAccount, setCheckingAccount] = useState(true);
  useEffect(() => {
    let active = true;
    async function resumeExistingAccount() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const profile: unknown = await response.json();
        if (isProfileDto(profile)) router.replace(landingPath(profile.role));
      } finally {
        if (active) setCheckingAccount(false);
      }
    }
    void resumeExistingAccount();
    return () => { active = false; };
  }, [router]);
  const choose = (chapter: string) => {
    const role = new URLSearchParams(window.location.search).get("role");
    if (role === "Active Member" || role === "Rush Chair") {
      window.location.assign(`/profile/setup?role=${encodeURIComponent(role)}&chapter=${encodeURIComponent(chapter)}`);
      return;
    }
    window.location.assign(`/member/chair?chapter=${encodeURIComponent(chapter)}`);
  };
  if (checkingAccount) return <main className="cal-poly-app chapter-picker"><section className="chapter-picker-body member-directory-body"><p className="eyebrow">CAL POLY IFC</p><h1>Loading your<br />member workspace.</h1></section></main>;

  return <main className="cal-poly-app chapter-picker">
    <section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER SETUP</p></section>
    <section className="chapter-picker-body member-directory-body">
      <p className="eyebrow">CHAPTER SELECTION</p><h1>Which chapter<br />are you in?</h1>
      <p>Select your chapter so we can prepare the right member workspace and send your profile to the correct rush chair.</p>
      <section className="directory-note"><span>✦</span><p>Choose your chapter to continue with active-member verification.</p></section>
      <section className="section-heading"><div><p className="eyebrow">RECOGNIZED CHAPTERS</p><h3>Find your chapter</h3></div><span className="chapter-count">{chapters.length}</span></section>
      <section className="chapter-grid">{chapters.map((chapter) => <button className="chapter-tile chapter-letter-tile" key={chapter.name} onClick={() => choose(chapter.name)} style={{ "--chapter": chapter.colors[0], "--chapter-accent": chapter.colors[1] } as CSSProperties}><span className="tile-letters">{chapter.short}</span><strong>{chapter.name}</strong><small>Choose chapter <b>→</b></small></button>)}</section>
    </section>
  </main>;
}
