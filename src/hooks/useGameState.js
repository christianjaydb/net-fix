import { useCallback, useEffect, useRef, useState } from "react";
import { generateScenario } from "../engine/scenarios";
import { cloneState } from "../engine/network";

const ROUNDS_PER_SESSION = 6;
const POINTS = { Easy: 100, Medium: 150, Hard: 220 };
const HINT_PENALTY = 15;

export function useGameState() {
  const [screen, setScreen] = useState("start"); // start | playing | scenario-solved | results
  const [difficulty, setDifficulty] = useState("Easy");
  const [scenario, setScenario] = useState(null);
  const [liveState, setLiveState] = useState(null);
  const [history, setHistory] = useState([]); // terminal output log
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { correct, points, explanation }
  const [inspectedDevice, setInspectedDevice] = useState(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (screen !== "playing" || !roundStartTime) return;
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - roundStartTime), 250);
    return () => clearInterval(tickRef.current);
  }, [screen, roundStartTime]);

  const beginSession = useCallback((diff) => {
    setDifficulty(diff);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setAttempts(0);
    setRound(1);
    setSessionStartTime(Date.now());
    const s = generateScenario(diff);
    setScenario(s);
    setLiveState(cloneState(s.state));
    setHistory([]);
    setHintsUsedThisRound(0);
    setRevealedClues(1);
    setRoundStartTime(Date.now());
    setElapsedMs(0);
    setLastResult(null);
    setInspectedDevice(null);
    setScreen("playing");
  }, []);

  const nextScenario = useCallback(() => {
    if (round >= ROUNDS_PER_SESSION) {
      setTotalTimeMs(Date.now() - sessionStartTime);
      setScreen("results");
      return;
    }
    const s = generateScenario(difficulty);
    setScenario(s);
    setLiveState(cloneState(s.state));
    setHistory([]);
    setHintsUsedThisRound(0);
    setRevealedClues(1);
    setRound((r) => r + 1);
    setRoundStartTime(Date.now());
    setElapsedMs(0);
    setLastResult(null);
    setInspectedDevice(null);
    setScreen("playing");
  }, [round, difficulty, sessionStartTime]);

  const skipToResults = useCallback(() => {
    setTotalTimeMs(Date.now() - sessionStartTime);
    setScreen("results");
  }, [sessionStartTime]);

  const pushHistory = useCallback((entry) => {
    setHistory((h) => [...h, { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);

  const revealHint = useCallback(() => {
    setHintsUsedThisRound((n) => n + 1);
    setRevealedClues((n) => Math.min(n + 1, scenario?.clues.length ?? n + 1));
  }, [scenario]);

  const updateLiveState = useCallback((mutator) => {
    setLiveState((prev) => {
      const next = cloneState(prev);
      mutator(next);
      return next;
    });
  }, []);

  const submitFix = useCallback(() => {
    if (!scenario || !liveState) return;
    setAttempts((a) => a + 1);
    const correct = scenario.isFixedFn(liveState);
    const timeTakenMs = Date.now() - roundStartTime;
    if (correct) {
      const base = POINTS[scenario.difficulty] ?? 100;
      const hintCost = hintsUsedThisRound * HINT_PENALTY;
      const speedBonus = timeTakenMs < 45000 ? 30 : timeTakenMs < 90000 ? 15 : 0;
      const points = Math.max(20, base - hintCost + speedBonus);
      setScore((s) => s + points);
      setStreak((st) => {
        const next = st + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      setCorrectCount((c) => c + 1);
      setLastResult({ correct: true, points, explanation: scenario.explanationFn(liveState), timeTakenMs });
    } else {
      setStreak(0);
      setLastResult({ correct: false, points: 0, explanation: null, timeTakenMs });
    }
    setScreen("scenario-solved");
    return correct;
  }, [scenario, liveState, roundStartTime, hintsUsedThisRound]);

  const retryAfterMiss = useCallback(() => {
    setScreen("playing");
    setLastResult(null);
  }, []);

  const restart = useCallback(() => {
    setScreen("start");
    setScenario(null);
    setLiveState(null);
  }, []);

  return {
    screen,
    difficulty,
    scenario,
    liveState,
    history,
    round,
    roundsTotal: ROUNDS_PER_SESSION,
    score,
    streak,
    bestStreak,
    correctCount,
    attempts,
    hintsUsedThisRound,
    revealedClues,
    elapsedMs,
    totalTimeMs,
    lastResult,
    inspectedDevice,
    setInspectedDevice,
    beginSession,
    nextScenario,
    skipToResults,
    pushHistory,
    revealHint,
    updateLiveState,
    submitFix,
    retryAfterMiss,
    restart,
  };
}
