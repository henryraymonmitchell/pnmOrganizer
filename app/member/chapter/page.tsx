"use client";

import type { CSSProperties } from "react";

type Chapter = { name: string; short: string; colors: [string, string] };

const chapters: Chapter[] = [
  { name: "Alpha Epsilon Pi", short: "AΕΠ", colors: ["#0e5b9a", "#f8c629"] }, { name: "Alpha Sigma Phi", short: "ΑΣΦ", colors: ["#cf1530", "#929ba0"] },
  { name: "Beta Theta Pi", short: "ΒΘΠ", colors: ["#142d60", "#ffffff"] }, { name: "Delta Chi", short: "ΔΧ", colors: ["#e0062f", "#ffd34e"] },
  { name: "Delta Sigma Phi", short: "ΔΣΦ", colors: ["#008f3b", "#ffd300"] }, { name: "Delta Upsilon", short: "ΔΥ", colors: ["#2f619b", "#ffce47"] },
  { name: "Kappa Sigma", short: "ΚΣ", colors: ["#be0d3d", "#ffffff"] }, { name: "Lambda Chi Alpha", short: "ΛΧΑ", colors: ["#00733e", "#dca82c"] },
  { name: "Phi Delta Theta", short: "ΦΔΘ", colors: ["#192b5f", "#d9b56d"] }, { name: "Phi Gamma Delta", short: "FIJI", colors: ["#48206f", "#ffffff"] },
  { name: "Phi Kappa Psi", short: "ΦΚΨ", colors: ["#f2a821", "#171717"] }, { name: "Phi Sigma Kappa", short: "ΦΣΚ", colors: ["#c8143b", "#d6d6d6"] },
  { name: "Pi Kappa Phi", short: "ΠΚΦ", colors: ["#075a9c", "#dca82c"] }, { name: "Sigma Nu", short: "ΣΝ", colors: ["#1b1a18", "#b3a073"] },
  { name: "Sigma Phi Epsilon", short: "ΣΦΕ", colors: ["#5c2380", "#ffffff"] }, { name: "Sigma Pi", short: "ΣΠ", colors: ["#453d6b", "#ffffff"] },
  { name: "Theta Chi", short: "ΘΧ", colors: ["#d51b2f", "#ffffff"] }, { name: "Zeta Beta Tau", short: "ΖΒΤ", colors: ["#0b3049", "#ffd000"] },
  { name: "Pi Kappa Alpha", short: "ΠΚΑ", colors: ["#751b2a", "#d3aa68"] }
];

export default function MemberChapterSelection() {
  const choose = (chapter: string) => window.location.assign(`/member/chair?chapter=${encodeURIComponent(chapter)}`);
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
