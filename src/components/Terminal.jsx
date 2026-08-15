import React, { useEffect, useRef, useState } from "react";
import { runIpconfig, runPing, runTracert } from "../engine/commands";

const HOST_OPTIONS = [
  { key: "pcA", label: "PC-A" },
  { key: "pcB", label: "PC-B" },
  { key: "server", label: "SRV1" },
];

const TARGET_OPTIONS = [
  { key: "gateway", label: "Gateway (R1)" },
  { key: "pcA", label: "PC-A" },
  { key: "pcB", label: "PC-B" },
  { key: "server", label: "SRV1" },
  { key: "internet", label: "Internet (raw IP)" },
  { key: "website", label: "www.netfix-status.io" },
];

export default function Terminal({ state, history, onRun }) {
  const [fromKey, setFromKey] = useState("pcA");
  const [command, setCommand] = useState("ping");
  const [targetKey, setTargetKey] = useState("gateway");
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [history]);

  const targets = TARGET_OPTIONS.filter((t) => t.key !== fromKey);

  function execute() {
    let result;
    if (command === "ipconfig") result = runIpconfig(state, fromKey);
    else if (command === "ping") result = runPing(state, fromKey, targetKey);
    else result = runTracert(state, fromKey, targetKey);
    onRun(result);
  }

  return (
    <div className="nf-terminal">
      <div className="nf-terminal-titlebar">
        <span className="nf-dot dot-r" />
        <span className="nf-dot dot-y" />
        <span className="nf-dot dot-g" />
        <span className="nf-terminal-title mono">command-shell</span>
      </div>

      <div className="nf-terminal-builder">
        <label className="nf-builder-field">
          <span>on</span>
          <select className="nf-select mono" value={fromKey} onChange={(e) => setFromKey(e.target.value)}>
            {HOST_OPTIONS.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </label>

        <label className="nf-builder-field">
          <span>run</span>
          <select className="nf-select mono" value={command} onChange={(e) => setCommand(e.target.value)}>
            <option value="ipconfig">ipconfig</option>
            <option value="ping">ping</option>
            <option value="tracert">tracert</option>
          </select>
        </label>

        {command !== "ipconfig" && (
          <label className="nf-builder-field nf-builder-field-grow">
            <span>target</span>
            <select className="nf-select mono" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
              {targets.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="nf-btn nf-btn-run" onClick={execute}>
          Run ▶
        </button>
      </div>

      <div className="nf-terminal-log mono scrollbar-thin" ref={logRef}>
        {history.length === 0 && (
          <p className="nf-terminal-placeholder">Build a command above and hit Run — output streams in here.</p>
        )}
        {history.map((h) => (
          <div key={h.id} className="nf-terminal-entry">
            <div className="nf-terminal-prompt">
              <span className="nf-prompt-host">{h.ranOn}&gt;</span> {h.command}
            </div>
            {h.lines.map((line, i) => (
              <div key={i} className={`nf-terminal-line ${h.ok === false && i === 1 ? "is-danger" : ""}`}>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
