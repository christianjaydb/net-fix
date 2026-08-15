import React from "react";

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TopBar({ inGame, round, roundsTotal, score, streak, elapsedMs, theme, onToggleTheme, onQuit }) {
  return (
    <header className="nf-topbar">
      <div className="nf-brand">
        <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="20" fill="var(--surface-3)" />
          <path d="M20 70 L20 50 L50 50 L50 30 L80 30" stroke="var(--amber)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="80" cy="30" r="8" fill="var(--teal)" />
          <circle cx="20" cy="70" r="8" fill="var(--teal)" />
        </svg>
        <div className="nf-brand-text">
          <span className="nf-brand-title">NetFix</span>
          <span className="nf-brand-sub">Network Troubleshooter</span>
        </div>
      </div>

      {inGame && (
        <div className="nf-hud">
          <div className="nf-hud-stat">
            <span className="nf-hud-label">Round</span>
            <span className="nf-hud-value mono">{round}/{roundsTotal}</span>
          </div>
          <div className="nf-hud-stat">
            <span className="nf-hud-label">Score</span>
            <span className="nf-hud-value mono">{score}</span>
          </div>
          <div className="nf-hud-stat">
            <span className="nf-hud-label">Streak</span>
            <span className="nf-hud-value mono">{streak}🔥</span>
          </div>
          <div className="nf-hud-stat">
            <span className="nf-hud-label">Time</span>
            <span className="nf-hud-value mono">{fmtTime(elapsedMs)}</span>
          </div>
        </div>
      )}

      <div className="nf-topbar-actions">
        {inGame && (
          <button className="nf-btn nf-btn-ghost nf-btn-sm" onClick={onQuit}>
            End Session
          </button>
        )}
        <button className="nf-icon-btn" onClick={onToggleTheme} aria-label="Toggle dark and light mode">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
