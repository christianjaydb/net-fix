import React, { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import StartScreen from "./components/StartScreen";
import NetworkDiagram from "./components/NetworkDiagram";
import Terminal from "./components/Terminal";
import CluePanel from "./components/CluePanel";
import DeviceInspector from "./components/DeviceInspector";
import ResultModal from "./components/ResultModal";
import ResultsScreen from "./components/ResultsScreen";
import { useGameState } from "./hooks/useGameState";
import "./styles/app.css";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const game = useGameState();

  const handleChangeDevice = (deviceKey, field, value) => {
    game.updateLiveState((s) => {
      s.devices[deviceKey][field] = value;
    });
  };

  const handleChangePort = (portKey, field, value) => {
    game.updateLiveState((s) => {
      s.devices.switch.ports[portKey][field] = value;
    });
  };

  const handleChangeTrunk = (vlan, shouldAllow) => {
    game.updateLiveState((s) => {
      const set = new Set(s.devices.switch.trunk.allowedVlans);
      if (shouldAllow) set.add(vlan);
      else set.delete(vlan);
      s.devices.switch.trunk.allowedVlans = Array.from(set).sort();
    });
  };

  return (
    <div className="app-shell">
      <div className="blueprint-bg" />
      <TopBar
        inGame={game.screen !== "start"}
        round={game.round}
        roundsTotal={game.roundsTotal}
        score={game.score}
        streak={game.streak}
        elapsedMs={game.elapsedMs}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onQuit={game.skipToResults}
      />

      <main className="nf-main">
        {game.screen === "start" && <StartScreen onStart={game.beginSession} />}

        {(game.screen === "playing" || game.screen === "scenario-solved") && game.scenario && (
          <div className="nf-game-layout">
            <section className="nf-diagram-panel">
              <div className="nf-diagram-panel-head">
                <h3>Network Topology</h3>
                <span className="nf-diagram-hint">Click any device to inspect &amp; configure it</span>
              </div>
              <NetworkDiagram
                state={game.liveState}
                selected={game.inspectedDevice}
                onSelectDevice={game.setInspectedDevice}
              />
              <div className="nf-legend">
                <span><i className="nf-dotstat ok" /> Link up</span>
                <span><i className="nf-dotstat down" /> Link down</span>
              </div>
            </section>

            <section className="nf-terminal-panel">
              <Terminal state={game.liveState} history={game.history} onRun={game.pushHistory} />
            </section>

            <section className="nf-clue-panel-wrap">
              <CluePanel
                scenario={game.scenario}
                revealedClues={game.revealedClues}
                hintsUsed={game.hintsUsedThisRound}
                onHint={game.revealHint}
                onSubmit={game.submitFix}
              />
            </section>
          </div>
        )}

        {game.screen === "results" && (
          <ResultsScreen
            stats={{
              score: game.score,
              correctCount: game.correctCount,
              roundsTotal: game.roundsTotal,
              attempts: game.attempts,
              bestStreak: game.bestStreak,
              totalTimeMs: game.totalTimeMs,
              difficulty: game.difficulty,
            }}
            onRestart={game.restart}
            onSameDifficulty={() => game.beginSession(game.difficulty)}
          />
        )}
      </main>

      {game.inspectedDevice && game.screen === "playing" && (
        <DeviceInspector
          deviceKey={game.inspectedDevice}
          state={game.liveState}
          onChangeDevice={handleChangeDevice}
          onChangePort={handleChangePort}
          onChangeTrunk={handleChangeTrunk}
          onClose={() => game.setInspectedDevice(null)}
        />
      )}

      {game.screen === "scenario-solved" && (
        <ResultModal
          result={game.lastResult}
          scenario={game.scenario}
          isLastRound={game.round >= game.roundsTotal}
          onNext={game.nextScenario}
          onRetry={game.retryAfterMiss}
        />
      )}
    </div>
  );
}
