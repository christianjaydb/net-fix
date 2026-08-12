import React from "react";

export default function ResultModal({ result, scenario, isLastRound, onNext, onRetry }) {
  if (!result) return null;
  return (
    <div className="nf-modal-backdrop">
      <div className={`nf-modal ${result.correct ? "is-correct" : "is-incorrect"}`} role="dialog" aria-modal="true">
        <div className="nf-modal-icon">{result.correct ? "✔" : "✕"}</div>
        <h2>{result.correct ? "Fixed it." : "Not quite fixed yet."}</h2>

        {result.correct ? (
          <>
            <p className="nf-modal-points">+{result.points} points</p>
            <div className="nf-modal-explain">
              <span className="nf-field-label">Why this was the fix</span>
              <p>{result.explanation}</p>
            </div>
            <button className="nf-btn nf-btn-primary nf-btn-wide" onClick={onNext}>
              {isLastRound ? "See Final Results ▶" : "Next Scenario ▶"}
            </button>
          </>
        ) : (
          <>
            <p className="nf-modal-sub">The network still isn't behaving the way it should. Re-check the symptoms and try running a command to see what changed.</p>
            <button className="nf-btn nf-btn-primary nf-btn-wide" onClick={onRetry}>
              Back to Diagnosis
            </button>
          </>
        )}
      </div>
    </div>
  );
}
