"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAuthSessionDto } from "@/lib/auth-domain";
import { isProfileDto, type ProfileRole } from "@/lib/profile-domain";

type Role = ProfileRole | null;

function landingPath(role: ProfileRole) {
  if (role === "PNM") return "/pnm";
  if (role === "Rush Chair") return "/member?chair=yes";
  if (role === "IFC Admin") return "/member?role=IFC%20Admin";
  return "/member?chair=no";
}

function apiError(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

export default function AccountGateway() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [emailUsername, setEmailUsername] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const email = useMemo(() => `${emailUsername.trim().toLocaleLowerCase()}@calpoly.edu`, [emailUsername]);
  const hasUsername = emailUsername.trim().length > 1;

  useEffect(() => {
    let active = true;
    const isSwitching = new URLSearchParams(window.location.search).get("switch") === "1";
    setSwitchingAccount(isSwitching);
    async function resumeExistingAccount() {
      try {
        const [profileResponse, sessionResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);
        const profile: unknown = profileResponse.ok ? await profileResponse.json() : null;
        const session: unknown = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!active) return;
        if (isAuthSessionDto(session) && session.email_verified) {
          setEmailUsername(session.email.replace(/@calpoly\.edu$/i, ""));
          setVerified(true);
        }
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
    setCodeSent(false);
    setCode("");
    setError("");
  };

  const sendEmailCode = async () => {
    if (!hasUsername || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(result, "We could not send a confirmation code."));
      setCodeSent(true);
      setCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send a confirmation code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isAuthSessionDto(result)) throw new Error(apiError(result, "We could not verify that confirmation code."));
      setVerified(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not verify that confirmation code.");
    } finally {
      setBusy(false);
    }
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
      {!role && <><p className="eyebrow">{switchingAccount ? "SWITCH ACCOUNT TYPE" : "WELCOME TO RUSH"}</p><h1>{switchingAccount ? "Choose your\nnew profile." : "Let’s set up\nyour profile."}</h1><p className="gateway-copy">Choose the profile that fits you. You’ll confirm your Cal Poly email before continuing.</p><div className="role-options"><button onClick={() => chooseRole("PNM")}><span className="role-icon">✦</span><strong>I’m a PNM</strong><small>I’m exploring IFC rush and attending events.</small><b>→</b></button><button onClick={() => chooseRole("Active Member")}><span className="role-icon">◈</span><strong>I’m an active member</strong><small>I’m helping my chapter recruit this fall.</small><b>→</b></button><button onClick={() => chooseRole("Rush Chair")}><span className="role-icon">✧</span><strong>I’m a rush chair</strong><small>I’m leading recruitment for my chapter.</small><b>→</b></button><button onClick={() => chooseRole("IFC Admin")}><span className="role-icon">⌘</span><strong>I’m an IFC Admin</strong><small>I coordinate recruitment across chapters.</small><b>→</b></button></div></>}
      {role && !verified && <><button className="gateway-back" onClick={() => chooseRole(null)}>← Change profile type</button><p className="eyebrow">EMAIL CONFIRMATION</p><h1>{codeSent ? "Check your\nCal Poly inbox." : "Use your Cal Poly\nemail."}</h1><p className="gateway-copy">{codeSent ? `Enter the six-digit confirmation code sent to ${email}.` : "Enter your Cal Poly username. The school email domain is already included."}</p><label className="gateway-label">Cal Poly email<div className="email-field"><input autoFocus disabled={codeSent || busy} value={emailUsername} onChange={(event) => setEmailUsername(event.target.value.replace(/@calpoly\.edu$/i, ""))} placeholder="your.username" /><span>@calpoly.edu</span></div></label>{codeSent && <label className="gateway-label">Confirmation code<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" /></label>}{error && <p className="email-error" role="alert">{error}</p>}<button className="gateway-next" disabled={busy || (codeSent ? code.length !== 6 : !hasUsername)} onClick={() => void (codeSent ? verifyEmailCode() : sendEmailCode())}>{busy ? "Please wait…" : codeSent ? "Confirm email →" : "Send confirmation code →"}</button>{codeSent && <button className="text-button" type="button" disabled={busy} onClick={() => void sendEmailCode()}>Use a different address or resend code</button>}</>}
      {role && verified && <><p className="eyebrow">EMAIL CONFIRMED · {role.toUpperCase()}</p><span className="verified-mark">✓</span><h1>You’re good<br />to go.</h1><p className="gateway-copy">Your Cal Poly email is confirmed. Next, verify a phone number and finish your {role.toLowerCase()} profile.</p><button className="gateway-next" onClick={continueSetup}>{role === "PNM" ? "Set up PNM profile →" : "Complete profile →"}</button></>}
    </section>
  </main>;
}
