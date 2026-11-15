"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isProfileDto, type ProfileRole } from "@/lib/profile-domain";

type Role = ProfileRole | null;

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
}

export default function AccountGateway() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const calPolyEmail = email.trim().length > 1;

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

  const chooseRole = (nextRole: Role) => { setRole(nextRole); setEmail(""); setVerified(false); };
  const continueSetup = () => {
    if (role === "PNM") router.push("/pnm");
    if (role === "IFC Admin") router.push(`/profile/setup?role=${encodeURIComponent(role)}`);
    if (role === "Active Member" || role === "Rush Chair") router.push(`/profile/setup?role=${encodeURIComponent(role)}`);
  };

  if (checkingAccount) return <main className="cal-poly-app account-gateway"><section className="gateway-card"><p className="eyebrow">CAL POLY IFC</p><h1>Loading your<br />rush portal.</h1></section></main>;

  return <main className="cal-poly-app account-gateway">
    <section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>CAL POLY IFC · FALL RUSH ’26</p></section>
    <section className="gateway-card">
      {!role && <><p className="eyebrow">WELCOME TO RUSH</p><h1>Let’s set up<br />your profile.</h1><p className="gateway-copy">Choose the profile that fits you. You’ll confirm your Cal Poly email before continuing.</p><div className="role-options"><button onClick={() => chooseRole("PNM")}><span className="role-icon">✦</span><strong>I’m a PNM</strong><small>I’m exploring IFC rush and attending events.</small><b>→</b></button><button onClick={() => chooseRole("Active Member")}><span className="role-icon">◈</span><strong>I’m an active member</strong><small>I’m helping my chapter recruit this fall.</small><b>→</b></button><button onClick={() => chooseRole("Rush Chair")}><span className="role-icon">✧</span><strong>I’m a rush chair</strong><small>I’m leading recruitment for my chapter.</small><b>→</b></button><button onClick={() => chooseRole("IFC Admin")}><span className="role-icon">⌘</span><strong>I’m an IFC Admin</strong><small>I coordinate recruitment across chapters.</small><b>→</b></button></div></>}
      {role && !verified && <><button className="gateway-back" onClick={() => chooseRole(null)}>← Change profile type</button><p className="eyebrow">EMAIL CONFIRMATION</p><h1>Use your Cal Poly<br />email.</h1><p className="gateway-copy">Enter your Cal Poly username. The school email domain is already included.</p><label className="gateway-label">Cal Poly email<div className="email-field"><input autoFocus value={email} onChange={(event) => setEmail(event.target.value.replace(/@calpoly\.edu$/i, ""))} placeholder="your.username" /><span>@calpoly.edu</span></div></label>{email && !calPolyEmail && <p className="email-error">Enter your Cal Poly username.</p>}<button className="gateway-next" disabled={!calPolyEmail} onClick={() => setVerified(true)}>Confirm email →</button></>}
      {role && verified && <><p className="eyebrow">EMAIL CONFIRMED · {role.toUpperCase()}</p><span className="verified-mark">✓</span><h1>You’re good<br />to go.</h1><p className="gateway-copy">Continue to enter the details for your {role.toLowerCase()} profile.</p><button className="gateway-next" onClick={continueSetup}>{role === "PNM" ? "Set up PNM profile →" : "Complete profile →"}</button></>}
    </section>
  </main>;
}
