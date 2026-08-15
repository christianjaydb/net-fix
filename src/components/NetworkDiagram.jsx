import React from "react";

const POS = {
  internet: { x: 400, y: 46 },
  router: { x: 400, y: 168 },
  switch: { x: 400, y: 288 },
  pcA: { x: 150, y: 420 },
  pcB: { x: 400, y: 420 },
  server: { x: 650, y: 420 },
};

function linkPath(a, b) {
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

function Link({ id, from, to, up, active, onSelect }) {
  const d = linkPath(POS[from], POS[to]);
  return (
    <g
      className={`nf-link ${up ? "is-up" : "is-down"} ${active ? "is-active" : ""}`}
      onClick={() => onSelect?.(id)}
    >
      <path d={d} className="nf-link-hit" />
      <path d={d} className="nf-link-line" />
      {up && (
        <circle r="3.4" className="nf-link-pulse">
          <animateMotion dur={active ? "1.6s" : "2.6s"} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

const ICONS = {
  internet: (
    <path d="M8 16c0-4 3-7 7-7 3 0 5.5 2 6.5 4.5C24 13.8 26 15.6 26 18.5c0 3-2.5 5.5-5.5 5.5H10c-3 0-6-2-6-5.5 0-2.7 2-4.7 4-5.2z" />
  ),
  router: (
    <>
      <rect x="6" y="14" width="22" height="10" rx="2" />
      <path d="M11 14v-2M17 14v-2M23 14v-2" strokeLinecap="round" />
      <circle cx="11" cy="19" r="1.2" fill="var(--surface)" stroke="none" />
      <circle cx="17" cy="19" r="1.2" fill="var(--surface)" stroke="none" />
    </>
  ),
  switch: (
    <>
      <rect x="5" y="13" width="24" height="9" rx="1.5" />
      {[8, 12, 16, 20, 24].map((x) => (
        <rect key={x} x={x} y="16.5" width="2" height="2.5" fill="var(--surface)" stroke="none" />
      ))}
    </>
  ),
  pc: (
    <>
      <rect x="7" y="7" width="20" height="14" rx="1.5" />
      <path d="M13 25h8M17 21v4" strokeLinecap="round" />
    </>
  ),
  server: (
    <>
      <rect x="7" y="6" width="20" height="8" rx="1.5" />
      <rect x="7" y="16" width="20" height="8" rx="1.5" />
      <circle cx="11" cy="10" r="1" fill="var(--surface)" stroke="none" />
      <circle cx="11" cy="20" r="1" fill="var(--surface)" stroke="none" />
    </>
  ),
};

function Node({ id, label, sub, icon, status, faulted, focused, selected, onSelect, badge }) {
  const p = POS[id];
  return (
    <g
      className={`nf-node status-${status} ${selected ? "is-selected" : ""} ${focused ? "is-focused" : ""}`}
      transform={`translate(${p.x}, ${p.y})`}
      onClick={() => onSelect(id)}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${label}`}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(id)}
    >
      <circle r="38" className="nf-node-ring" />
      <circle r="30" className="nf-node-body" />
      <g className="nf-node-icon" transform="translate(-17,-17)">
        {icon}
      </g>
      {badge && (
        <g transform="translate(24,-24)">
          <circle r="9" className="nf-node-badge-bg" />
          <text textAnchor="middle" dy="3.5" className="nf-node-badge-text">
            {badge}
          </text>
        </g>
      )}
      <text y="54" textAnchor="middle" className="nf-node-label">
        {label}
      </text>
      {sub && (
        <text y="70" textAnchor="middle" className="nf-node-sub mono">
          {sub}
        </text>
      )}
    </g>
  );
}

export default function NetworkDiagram({ state, focusHint, selected, onSelectDevice }) {
  if (!state) return null;
  const { devices } = state;
  const ports = devices.switch.ports;

  const links = [
    { id: "internet-router", from: "internet", to: "router", up: true },
    { id: "router-switch", from: "router", to: "switch", up: true },
    { id: "switch-pcA", from: "switch", to: "pcA", up: ports.pcA.enabled },
    { id: "switch-pcB", from: "switch", to: "pcB", up: ports.pcB.enabled },
    { id: "switch-server", from: "switch", to: "server", up: ports.server.enabled },
  ];

  return (
    <svg viewBox="0 0 800 480" className="nf-diagram" role="group" aria-label="Network topology diagram">
      <defs>
        <filter id="nfGlowAmber" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {links.map((l) => (
        <Link key={l.id} {...l} active={l.up} onSelect={() => {}} />
      ))}

      <Node
        id="internet"
        label="Internet"
        icon={ICONS.internet}
        status="neutral"
        selected={selected === "internet"}
        onSelect={onSelectDevice}
      />
      <Node
        id="router"
        label={devices.router.name}
        sub={devices.router.lanIp}
        icon={ICONS.router}
        status="ok"
        focused={focusHint === "router"}
        selected={selected === "router"}
        onSelect={onSelectDevice}
        badge="R"
      />
      <Node
        id="switch"
        label={devices.switch.name}
        sub={`${Object.values(ports).filter((p) => p.enabled).length}/3 ports up`}
        icon={ICONS.switch}
        status="ok"
        focused={focusHint === "switch"}
        selected={selected === "switch"}
        onSelect={onSelectDevice}
        badge="SW"
      />
      <Node
        id="pcA"
        label={devices.pcA.name}
        sub={devices.pcA.ip}
        icon={ICONS.pc}
        status={ports.pcA.enabled ? "ok" : "down"}
        focused={focusHint === "pcA"}
        selected={selected === "pcA"}
        onSelect={onSelectDevice}
        badge={`v${ports.pcA.vlan}`}
      />
      <Node
        id="pcB"
        label={devices.pcB.name}
        sub={devices.pcB.ip}
        icon={ICONS.pc}
        status={ports.pcB.enabled ? "ok" : "down"}
        focused={focusHint === "pcB"}
        selected={selected === "pcB"}
        onSelect={onSelectDevice}
        badge={`v${ports.pcB.vlan}`}
      />
      <Node
        id="server"
        label={devices.server.name}
        sub={devices.server.ip}
        icon={ICONS.server}
        status={ports.server.enabled ? "ok" : "down"}
        focused={focusHint === "server"}
        selected={selected === "server"}
        onSelect={onSelectDevice}
        badge={`v${ports.server.vlan}`}
      />
    </svg>
  );
}
