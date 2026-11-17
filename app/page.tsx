"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthSessionDto } from "@/lib/auth-domain";
import { isProfileDto, PROFILE_ROLES, type ProfileRole } from "@/lib/profile-domain";

type Role = ProfileRole | null;

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
}

function roleFromQuery(value: string | null): Role {
  return PROFILE_ROLES.find((candidate) => candidate === value) ?? null;
}

export default function AccountGateway() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [verified, setVerified] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const parameters = new URLSearchParams(window.location.search);
    const isSwitching = parameters.get("switch") === "1";
    const requestedRole = roleFromQuery(parameters.get("role"));
    const authError = parameters.get("auth_error");
    setSwitchingAccount(isSwitching);
    if (requestedRole) setRole(requestedRole);
    if (authError) setError(authError);

    async function resumeExistingAccount() {
      try {
        const [profileResponse, sessionResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);
        const profile: unknown = profileResponse.ok ? await profileResponse.json() : null;
        const session: unknown = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!active) return;
        if (isAuthSessionDto(session) && session.email_verified) setVerified(true);
        if (isProfileDto(profile) && profile.email_verified_at && profile.phone_verified_at && !isSwitching) {
          router.replace(landingPath(profile.role));
        }
      } finally {
        if (active) setCheckingAccount(false);
      }
    }

    void resumeExistingAccount();
    return () => { active = false; };
  }, [router]);

  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
    setError("");
  };

  const beginMicrosoftSignIn = () => {
    if (!role || busy) return;
    setBusy(true);
    setError("");
    const next = new URLSearchParams({ role });
    if (switchingAccount) next.set("switch", "1");
    window.location.assign(`/api/auth/microsoft/start?next=${encodeURIComponent(`/?${next.toString()}`)}`);
  };

  const continueSetup = () => {
    const switchParam = switchingAccount ? "&switch=1" : "";
    if (role === "PNM") router.push(`/pnm${switchingAccount ? "?switch=1" : ""}`);
    if (role === "IFC Admin") router.push(`/profile/setup?role=${encodeURIComponent(role)}${switchParam}`);
    if (role === "Active Member" || role === "Rush Chair") router.push(`/profile/setup?role=${encodeURIComponent(role)}${switchParam}`);
  };

  if (checkingAccount) return <main className="cal-poly-app account-gateway"><section className="gateway-card"><p className="eyebrow">CAL POLY IFC</p><h1>Loading your<br />rush portal.</h1></section></main>;

  return <main className="cal-poly-app account-gateway">
    <section className="gateway-top"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /><p>CAL POLY IFC · FALL RUSH ’26</p></section>
    <section className="gateway-card">
      {!role && <><p className="eyebrow">{switchingAccount ? "SWITCH ACCOUNT TYPE" : "WELCOME TO RUSH"}</p><h1>{switchingAccount ? "Choose your\nnew profile." : "Let’s set up\nyour profile."}</h1><p className="gateway-copy">Choose the profile that fits you. You’ll sign in through Cal Poly Microsoft 365 before continuing.</p><div className="role-options"><button onClick={() => chooseRole("PNM")}><span className="role-icon">✦</span><strong>I’m a PNM</strong><small>I’m exploring IFC rush and attending events.</small><b>→</b></button><button onClick={() => chooseRole("Active Member")}><span className="role-icon">◈</span><strong>I’m an active member</strong><small>I’m helping my chapter recruit this fall.</small><b>→</b></button><button onClick={() => chooseRole("Rush Chair")}><span className="role-icon">✧</span><strong>I’m a rush chair</strong><small>I’m leading recruitment for my chapter.</small><b>→</b></button><button onClick={() => chooseRole("IFC Admin")}><span className="role-icon">⌘</span><strong>I’m an IFC Admin</strong><small>I coordinate recruitment across chapters.</small><b>→</b></button></div></>}
      {role && !verified && <><button className="gateway-back" onClick={() => chooseRole(null)}>← Change profile type</button><p className="eyebrow">CAL POLY SIGN-IN</p><h1>Sign in with<br />Cal Poly.</h1><p className="gateway-copy">Continue on the official Microsoft 365 sign-in page. Your password and MFA stay with Cal Poly — Rush only receives the verified @calpoly.edu identity.</p>{error && <p className="email-error" role="alert">{error}</p>}<button className="gateway-next" disabled={busy} onClick={beginMicrosoftSignIn}>{busy ? "Opening Microsoft…" : "Continue with Microsoft 365 →"}</button><p className="gateway-copy gateway-provider-note">Use the same Microsoft account you use for Outlook and Cal Poly email.</p></>}
      {role && verified && <><p className="eyebrow">CAL POLY SIGNED IN · {role.toUpperCase()}</p><span className="verified-mark">✓</span><h1>You’re good<br />to go.</h1><p className="gateway-copy">Your Cal Poly Microsoft account is confirmed. Next, verify a phone number and finish your {role.toLowerCase()} profile.</p><button className="gateway-next" onClick={continueSetup}>{role === "PNM" ? "Set up PNM profile →" : "Complete profile →"}</button></>}
    </section>
  </main>;
}
