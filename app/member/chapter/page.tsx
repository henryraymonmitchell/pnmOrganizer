"use client";

import { useState } from "react";

const chapters = [
  ["Alpha Epsilon Pi", "AΕΠ", "#174b3b", "#f4c34f"], ["Alpha Sigma Phi", "ΑΣΦ", "#214a70", "#ffffff"], ["Beta Theta Pi", "ΒΘΠ", "#8a1f2d", "#d8b55b"], ["Delta Chi", "ΔΧ", "#b12031", "#d9bd7a"], ["Delta Sigma Phi", "ΔΣΦ", "#386f94", "#ffffff"], ["Delta Upsilon", "ΔΥ", "#1d4c86", "#d1af55"], ["Kappa Sigma", "ΚΣ", "#a61d32", "#e8c55e"], ["Lambda Chi Alpha", "ΛΧΑ", "#5b265d", "#e7c96e"], ["Phi Delta Theta", "ΦΔΘ", "#29623e", "#ffffff"], ["Phi Gamma Delta", "FIJI", "#5e266c", "#ffffff"], ["Phi Kappa Psi", "ΦΚΨ", "#a82030", "#ffffff"], ["Phi Sigma Kappa", "ΦΣΚ", "#642c5c", "#e2bd61"], ["Pi Kappa Phi", "ΠΚΦ", "#cb3830", "#f3d274"], ["Sigma Nu", "ΣΝ", "#152f56", "#d0a93f"], ["Sigma Phi Epsilon", "ΣΦΕ", "#77252e", "#ffffff"], ["Sigma Pi", "ΣΠ", "#4c2764", "#e6ce67"], ["Theta Chi", "ΘΧ", "#9a2636", "#f0c754"], ["Zeta Beta Tau", "ΖΒΤ", "#235591", "#ffffff"], ["Pi Kappa Alpha", "ΠΚΑ", "#952c38", "#e8c35c"]
];

export default function MemberChapterSelection() {
  const choose = (chapter: string) => window.location.assign(`/member/chair?chapter=${encodeURIComponent(chapter)}`);
  return <main className="cal-poly-app chapter-picker"><section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER SETUP</p></section><section className="chapter-picker-body"><p className="eyebrow">CHAPTER SELECTION</p><h1>Which chapter<br />are you in?</h1><p>Select your chapter so we can prepare the right member workspace and send your profile to the correct rush chair.</p><section className="chapter-grid member-chapter-grid">{chapters.map(([name, mark, background, color]) => <button key={name} onClick={() => choose(name)}><span className="chapter-monogram" style={{ background, color }}>{mark}</span><strong>{name}</strong><small>Choose chapter <b>→</b></small></button>)}</section></section></main>;
}
