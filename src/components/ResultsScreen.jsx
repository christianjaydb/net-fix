import React from "react";

function rate({ correctCount, roundsTotal, attempts, bestStreak }) {
  const accuracy = roundsTotal ? correctCount / roundsTotal : 0;
  const efficiency = attempts ? correctCount / attempts : 0;
  const score = accuracy * 0.6 + efficiency * 0.25 + Math.min(bestStreak / roundsTotal, 1) * 0.15;
  if (score >= 0.85) return { label: "Network Technician", blurb: "Fast, accurate, and methodical — you diagnose faster than most tickets can pile up." };
  if (score >= 0.6) return { label: "Intermediate Technician", blurb: "Solid fundamentals with room to sharpen your diagnostic speed and accuracy." };
  return { label: "Beginner Technician", blurb: "You're building real troubleshooting instincts — another shift will make the patterns click." };
}

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function ResultsScreen({ stats, onRestart, onSameDifficulty }) {
  const { score, correctCount, roundsTotal, attempts, bestStreak, totalTimeMs, difficulty } = stats;
  const rating = rate({ correctCount, roundsTotal, attempts, bestStreak });
  const accuracyPct = roundsTotal ? Math.round((correctCount / roundsTotal) * 100) : 0;

  return (
    <div className="nf-results">
      <span className="nf-eyebrow">Shift complete</span>
      <h1 className="nf-results-rating">{rating.label}</h1>
      <p className="nf-results-blurb">{rating.blurb}</p>

      <div className="nf-results-grid">
        <div className="nf-results-stat">
          <span className="nf-hud-label">Final Score</span>
          <span className="nf-results-value mono">{score}</span>
        </div>
        <div className="nf-results-stat">
          <span className="nf-hud-label">Accuracy</span>
          <span className="nf-results-value mono">{accuracyPct}%</span>
        </div>
        <div className="nf-results-stat">
          <span className="nf-hud-label">Best Streak</span>
          <span className="nf-results-value mono">{bestStreak}</span>
        </div>
        <div className="nf-results-stat">
          <span className="nf-hud-label">Total Time</span>
          <span className="nf-results-value mono">{fmtTime(totalTimeMs)}</span>
        </div>
        <div className="nf-results-stat">
          <span className="nf-hud-label">Scenarios Solved</span>
          <span className="nf-results-value mono">{correctCount}/{roundsTotal}</span>
        </div>
        <div className="nf-results-stat">
          <span className="nf-hud-label">Difficulty</span>
          <span className="nf-results-value mono">{difficulty}</span>
        </div>
      </div>

      <div className="nf-results-actions">
        <button className="nf-btn nf-btn-primary nf-btn-lg" onClick={onSameDifficulty}>
          Run Another Shift ▶
        </button>
        <button className="nf-btn nf-btn-ghost" onClick={onRestart}>
          Change Difficulty
        </button>
      </div>
    </div>
  );
}
