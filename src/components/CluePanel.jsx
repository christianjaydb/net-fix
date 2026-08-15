import React from "react";

const DIFF_CLASS = { Easy: "diff-easy", Medium: "diff-medium", Hard: "diff-hard" };

export default function CluePanel({ scenario, revealedClues, onHint, onSubmit, hintsUsed }) {
  if (!scenario) return null;
  return (
    <div className="nf-clue-panel">
      <div className="nf-clue-head">
        <span className={`nf-pill ${DIFF_CLASS[scenario.difficulty]}`}>{scenario.difficulty}</span>
        <span className="nf-pill pill-neutral">{scenario.topic}</span>
      </div>
      <h2 className="nf-clue-title">{scenario.title}</h2>
      <p className="nf-clue-symptom">{scenario.symptom}</p>

      <div className="nf-clue-list">
        <span className="nf-field-label">Clues</span>
        <ul>
          {scenario.clues.slice(0, revealedClues).map((c, i) => (
            <li key={i} className="nf-clue-item">
              {c}
            </li>
          ))}
        </ul>
        {revealedClues < scenario.clues.length && (
          <button className="nf-btn nf-btn-ghost" onClick={onHint}>
            Reveal another clue ({revealedClues}/{scenario.clues.length})
          </button>
        )}
      </div>

      {hintsUsed > 0 && <p className="nf-clue-penalty">−{hintsUsed * 15} pts from hints used</p>}

      <button className="nf-btn nf-btn-primary nf-btn-wide" onClick={onSubmit}>
        Apply Fix &amp; Verify
      </button>
    </div>
  );
}
