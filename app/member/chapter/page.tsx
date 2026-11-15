"use client";

import type { CSSProperties } from "react";
import { chapters } from "@/lib/chapters";

export default function MemberChapterSelection() {
  const choose = (chapter: string) => {
    const role = new URLSearchParams(window.location.search).get("role");
    if (role === "Active Member" || role === "Rush Chair") {
      window.location.assign(`/profile/setup?role=${encodeURIComponent(role)}&chapter=${encodeURIComponent(chapter)}`);
      return;
    }
    window.location.assign(`/member/chair?chapter=${encodeURIComponent(chapter)}`);
  };
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
