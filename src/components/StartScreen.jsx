import React, { useState } from "react";

const DIFFS = [
  {
    id: "Easy",
    title: "Easy",
    desc: "Subnet masks, gateways, and switch ports. Good first shift.",
    topics: "Subnetting · Gateways · Switching",
  },
  {
    id: "Medium",
    title: "Medium",
    desc: "Address conflicts, DNS, and DHCP failures under time pressure.",
    topics: "IP Conflicts · DNS · DHCP",
  },
  {
    id: "Hard",
    title: "Hard",
    desc: "VLANs, trunk pruning, and upstream routing faults.",
    topics: "VLANs · Trunking · Routing",
  },
];

export default function StartScreen({ onStart }) {
  const [selected, setSelected] = useState("Easy");

  return (
    <div className="nf-start">
      <div className="nf-start-hero">
        <span className="nf-eyebrow">IT Support Simulator</span>
        <h1 className="nf-hero-title">
          Something's wrong <span className="accent-amber">on the network.</span>
          <br />
          Find it. Fix it. <span className="accent-teal">Explain it.</span>
        </h1>
        <p className="nf-hero-sub">
          You're the on-call technician for a small office LAN. Read the symptoms, inspect real devices, run
          <code className="mono"> ipconfig</code>, <code className="mono">ping</code>, and <code className="mono">tracert</code>,
          then apply the correct fix before the next ticket comes in.
        </p>
      </div>

      <div className="nf-diff-grid">
        {DIFFS.map((d) => (
          <button
            key={d.id}
            className={`nf-diff-card ${selected === d.id ? "is-selected" : ""} diff-${d.id.toLowerCase()}`}
            onClick={() => setSelected(d.id)}
          >
            <span className="nf-diff-title">{d.title}</span>
            <span className="nf-diff-desc">{d.desc}</span>
            <span className="nf-diff-topics mono">{d.topics}</span>
          </button>
        ))}
      </div>

      <button className="nf-btn nf-btn-primary nf-btn-lg" onClick={() => onStart(selected)}>
        Start Shift — {selected} ▶
      </button>

      <p className="nf-start-footnote">6 scenarios per shift · every run is randomized · all commands are simulated, nothing here touches a real network.</p>
    </div>
  );
}
