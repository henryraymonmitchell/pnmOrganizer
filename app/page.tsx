"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "pnm" | "member" | null;

export default function AccountGateway() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");
  const [chair, setChair] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const calPolyEmail = email.trim().length > 1;

  const chooseRole = (nextRole: Role) => { setRole(nextRole); setEmail(""); setChair(null); setVerified(false); };
  const continueSetup = () => {
    if (role === "pnm") router.push("/pnm");
    if (role === "member") router.push("/member/chapter");
  };

  return <main className="cal-poly-app account-gateway">
    <section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>CAL POLY IFC · FALL RUSH ’26</p></section>
    <section className="gateway-card">
      {!role && <><p className="eyebrow">WELCOME TO RUSH</p><h1>Let’s set up<br />your profile.</h1><p className="gateway-copy">Choose the profile that fits you. You’ll verify your Cal Poly email before moving forward.</p><div className="role-options"><button onClick={() => chooseRole("pnm")}><span className="role-icon">✦</span><strong>I’m a PNM</strong><small>I’m exploring IFC rush and attending events.</small><b>→</b></button><button onClick={() => chooseRole("member")}><span className="role-icon">◈</span><strong>I’m an active member</strong><small>I’m helping my chapter recruit this fall.</small><b>→</b></button></div></>}
      {role && !verified && <><button className="gateway-back" onClick={() => chooseRole(null)}>← Change profile type</button><p className="eyebrow">EMAIL CONFIRMATION</p><h1>Use your Cal Poly<br />email.</h1><p className="gateway-copy">Enter your Cal Poly username. The school email domain is already included.</p><label className="gateway-label">Cal Poly email<div className="email-field"><input autoFocus value={email} onChange={(event) => setEmail(event.target.value.replace(/@calpoly\.edu$/i, ""))} placeholder="your.username" /><span>@calpoly.edu</span></div></label>{email && !calPolyEmail && <p className="email-error">Enter your Cal Poly username.</p>}<button className="gateway-next" disabled={!calPolyEmail} onClick={() => setVerified(true)}>Confirm email →</button></>}
      {role === "pnm" && verified && <><p className="eyebrow">EMAIL CONFIRMED</p><span className="verified-mark">✓</span><h1>You’re good<br />to go.</h1><p className="gateway-copy">Next, we’ll gather the few details chapters need to recognize you at the front booth.</p><button className="gateway-next" onClick={continueSetup}>Set up PNM profile →</button></>}
      {role === "member" && verified && <><p className="eyebrow">ACTIVE MEMBER SETUP</p><span className="verified-mark">✓</span><h1>Let’s find your<br />chapter.</h1><p className="gateway-copy">First choose your chapter. Then we’ll ask whether you are a rush chair and submit your profile for approval.</p><button className="gateway-next" onClick={continueSetup}>Choose my chapter →</button></>}
    </section>
  </main>;
}
