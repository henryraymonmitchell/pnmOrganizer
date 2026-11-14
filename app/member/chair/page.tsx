"use client";

import { useEffect, useState } from "react";

export default function RushChairChoice() {
  const [chapter, setChapter] = useState("your chapter");
  useEffect(() => { setChapter(new URLSearchParams(window.location.search).get("chapter") || "your chapter"); }, []);
  const choose = (chair: boolean) => window.location.assign(`/member?chair=${chair ? "yes" : "no"}&chapter=${encodeURIComponent(chapter)}&approval=pending`);
  return <main className="cal-poly-app chapter-picker"><section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>ACTIVE MEMBER SETUP</p></section><section className="gateway-card"><p className="eyebrow">{chapter.toUpperCase()}</p><h1>Are you a<br />rush chair?</h1><p className="gateway-copy">Rush chairs receive additional tools for invite lists, events, and member conversations.</p><div className="chair-options"><button onClick={() => choose(true)}><strong>Yes, I’m a rush chair</strong><small>Set up my chair profile</small></button><button onClick={() => choose(false)}><strong>No, I’m an active member</strong><small>Set up my member profile</small></button></div></section></main>;
}
