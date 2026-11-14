"use client";
import { useState } from "react";
const invitations = [
  { date: "THU · SEP 10", time: "7:00 – 9:00 PM", title: "Delta Tau Delta", subtitle: "Open House", place: "405 College Ave", status: "UP NEXT", map: "405+College+Ave" },
  { date: "FRI · SEP 11", time: "5:30 – 7:30 PM", title: "Sigma Chi", subtitle: "Patio Social", place: "11 Fraternity Row", status: "INVITED", map: "11+Fraternity+Row" },
  { date: "SAT · SEP 12", time: "1:00 – 3:00 PM", title: "Phi Delta Theta", subtitle: "Game Day", place: "217 Greek Circle", status: "INVITED", map: "217+Greek+Circle" }
];
export default function PnmDashboard() {
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  return <main className="cal-poly-app"><header className="cal-poly-header"><div className="brand brand-lockup"><img src="/brand/cal-poly-ifc.png" alt="Cal Poly IFC" /></div><span className="role-label">PNM PORTAL</span><button className="avatar" aria-label="Open profile">MR</button></header><div className="shell pnm">
    <section className="greeting"><div className="greeting-mark"><img src="/brand/cal-poly-cp.png" alt="Cal Poly" /></div><p className="eyebrow">CAL POLY IFC · FALL RUSH ’26</p><h1>Hey, Maya <span>✦</span></h1><p className="muted">Your guide to rush, all in one place.</p></section><section className="progress"><div><p className="eyebrow">YOUR RUSH</p><strong>Day 2 of 5</strong></div><div className="progress-dots"><b></b><b></b><b></b><b></b><b></b></div></section>
    <section className="section-heading"><div><p className="eyebrow">YOUR INVITATIONS</p><h3>Plan your rush</h3></div><button>3 invites <span>→</span></button></section><section className="event-cards">{invitations.map((event, index) => <article className={`next-card event-card event-card-${index}`} key={event.title}><div className="card-top"><span className="pill">{event.status}</span><span className="date">{event.date}</span></div><h2>{event.title}<br />{event.subtitle}</h2><p className="event-meta">◷ {event.time} <i /> ◉ {event.place}</p><div className="card-actions"><button className="primary" onClick={() => setRsvps({ ...rsvps, [event.title]: true })}>{rsvps[event.title] ? "✓ You’re going" : "RSVP now"}</button><button className="map" onClick={() => window.open(`https://maps.apple.com/?q=${event.map}`, "_blank")}>⌖ <span>Map</span></button></div></article>)}</section>
    <section className="info-banner"><span>✦</span><div><strong>Need a hand?</strong><p>See FAQs or contact the IFC team.</p></div><button>→</button></section></div><nav className="bottom-nav"><button className="nav-active"><span>⌂</span>Home</button><button><span>◫</span>Schedule</button><button className="scan"><span>⌁</span></button><button><span>♡</span>Invites</button><button><span>◌</span>Profile</button></nav></main>;
}
