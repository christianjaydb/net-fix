import React from "react";

function Field({ label, value, onChange, mono = true }) {
  return (
    <label className="nf-field">
      <span className="nf-field-label">{label}</span>
      <input
        className={`nf-input ${mono ? "mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="nf-toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`nf-toggle ${checked ? "is-on" : "is-off"}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="nf-toggle-thumb" />
      </button>
    </label>
  );
}

export default function DeviceInspector({ deviceKey, state, onChangeDevice, onChangePort, onChangeTrunk, onClose }) {
  if (!deviceKey || !state) return null;
  const d = state.devices[deviceKey];

  const set = (field) => (val) => onChangeDevice(deviceKey, field, val);

  let body = null;
  let title = "";

  if (deviceKey === "internet") {
    title = "Internet";
    body = (
      <p className="nf-inspector-note">
        The public internet — beyond your control. Everything upstream of R1's WAN interface. Use it as the
        destination to confirm whether a host has real internet reachability.
      </p>
    );
  } else if (d.type === "pc" || d.type === "server") {
    title = `${d.name} — ${d.type === "server" ? "File Server" : "Workstation"}`;
    const port = state.devices.switch.ports[deviceKey];
    body = (
      <>
        <div className="nf-inspector-status">
          <span className={`nf-pill ${port.enabled ? "pill-ok" : "pill-down"}`}>
            {port.enabled ? "Link up" : "Link down"}
          </span>
          <span className="nf-pill pill-neutral">VLAN {port.vlan}</span>
          <span className="nf-pill pill-neutral">{d.dhcpMode === "dhcp" ? "DHCP client" : "Static IP"}</span>
        </div>
        <Field label="IPv4 Address" value={d.ip} onChange={set("ip")} />
        <Field label="Subnet Mask" value={d.mask} onChange={set("mask")} />
        <Field label="Default Gateway" value={d.gateway} onChange={set("gateway")} />
        <Field label="DNS Server" value={d.dns} onChange={set("dns")} />
        <p className="nf-inspector-hint">Port assignment and VLAN for this host live on SW1's inspector.</p>
      </>
    );
  } else if (d.type === "router") {
    title = `${d.name} — Router`;
    body = (
      <>
        <div className="nf-inspector-status">
          <span className="nf-pill pill-neutral mono">LAN {d.lanIp}</span>
        </div>
        <Field label="WAN Gateway (ISP hand-off)" value={d.wanGateway} onChange={set("wanGateway")} />
        <Toggle label="DHCP Server" checked={d.dhcpEnabled} onChange={(v) => set("dhcpEnabled")(v)} />
        <p className="nf-inspector-hint mono">DHCP pool: {d.dhcpRange}</p>
        <p className="nf-inspector-hint">LAN gateway address is fixed — it's the reference every host's default gateway should match.</p>
      </>
    );
  } else if (d.type === "switch") {
    title = `${d.name} — Switch`;
    const rows = [
      ["pcA", "PC-A"],
      ["pcB", "PC-B"],
      ["server", "SRV1"],
    ];
    body = (
      <>
        {rows.map(([key, label]) => (
          <div key={key} className="nf-port-row">
            <span className="nf-port-name">{label}</span>
            <Toggle
              label="Enabled"
              checked={d.ports[key].enabled}
              onChange={(v) => onChangePort(key, "enabled", v)}
            />
            <label className="nf-select-row">
              <span>VLAN</span>
              <select
                className="nf-select mono"
                value={d.ports[key].vlan}
                onChange={(e) => onChangePort(key, "vlan", Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>
        ))}
        <div className="nf-trunk">
          <span className="nf-field-label">Trunk to R1 — allowed VLANs</span>
          <div className="nf-chip-row">
            {[10, 20].map((v) => {
              const on = d.trunk.allowedVlans.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  className={`nf-chip ${on ? "is-on" : ""}`}
                  onClick={() => onChangeTrunk(v, !on)}
                >
                  VLAN {v}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="nf-inspector-backdrop" onClick={onClose}>
      <aside className="nf-inspector" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${title} inspector`}>
        <header className="nf-inspector-header">
          <h3>{title}</h3>
          <button className="nf-icon-btn" onClick={onClose} aria-label="Close inspector">
            ✕
          </button>
        </header>
        <div className="nf-inspector-body scrollbar-thin">{body}</div>
      </aside>
    </div>
  );
}
