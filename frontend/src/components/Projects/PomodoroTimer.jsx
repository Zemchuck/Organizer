import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PomodoroTimer.css";
import { useLocation } from "react-router-dom";


const API = import.meta.env.VITE_API_URL || "/api";

export function Count({ task }) {
  // lekki badge używany np. w ProjectsView
  const [saving, setSaving] = useState(false);
  const inc = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      await fetch(`${API}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pomodoro_count: (task.pomodoro_count || 0) + 1 }),
      });
      task.pomodoro_count = (task.pomodoro_count || 0) + 1;
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="pomo-count">
      <button className="pomo-badge" onClick={inc} disabled={!task?.id || saving} title="Zwiększ licznik">
        🍅 {task?.pomodoro_count ?? 0}
      </button>
    </div>
  );
}

export default function PomodoroTimer() {
  const location = useLocation();
  const task = location.state?.task || null;

  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [rounds, setRounds] = useState(4);

  const [phase, setPhase] = useState("work"); // 'work' | 'break'
  const [remaining, setRemaining] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [doneRounds, setDoneRounds] = useState(0);

  const tickRef = useRef(null);

  useEffect(() => {
    setRemaining(workMin * 60);
  }, [workMin]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((s) => s - 1);
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  useEffect(() => {
    if (remaining >= 0) return;
    clearInterval(tickRef.current);

    if (phase === "work") {
      // zakończono pracę → +1 badge
      incrementPomodoro(task);
      setDoneRounds((r) => r + 1);
      if (doneRounds + 1 >= rounds) {
        // koniec sesji
        setRunning(false);
        setPhase("work");
        setRemaining(workMin * 60);
        return;
      } else {
        setPhase("break");
        setRemaining(breakMin * 60);
        setRunning(true);
      }
    } else {
      // koniec przerwy → znowu praca
      setPhase("work");
      setRemaining(workMin * 60);
      setRunning(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const start = () => setRunning(true);
  const pause = () => { clearInterval(tickRef.current); setRunning(false); };
  const reset = () => {
    clearInterval(tickRef.current);
    setRunning(false);
    setPhase("work");
    setRemaining(workMin * 60);
    setDoneRounds(0);
  };

  const mmss = useMemo(() => {
    const s = Math.max(0, remaining);
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  }, [remaining]);

  return (
    <div className="pomodoro-timer">
      <h4>{task?.title ? `Pomodoro • ${task.title}` : "Pomodoro"}</h4>

      <div className="pomo-settings">
        <label>
          Praca (min)
          <input
            type="number"
            min="1"
            value={workMin}
            onChange={(e) => setWorkMin(Number(e.target.value) || 1)}
            disabled={running}
          />
        </label>
        <label>
          Przerwa (min)
          <input
            type="number"
            min="1"
            value={breakMin}
            onChange={(e) => setBreakMin(Number(e.target.value) || 1)}
            disabled={running}
          />
        </label>
        <label>
          Rundy
          <input
            type="number"
            min="1"
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value) || 1)}
            disabled={running}
          />
        </label>
      </div>

      <div className="timer-display" aria-live="polite">
        {mmss} {phase === "break" ? "☕" : "🧠"}
      </div>

      <div>
        {!running ? (
          <button onClick={start}>Start</button>
        ) : (
          <button onClick={pause}>Pauza</button>
        )}
        <button className="end-session" onClick={reset}>Zakończ sesję</button>
      </div>

      {task?.pomodoro_count != null && (
        <div className="pomo-count">
          <span className="pomo-badge" aria-label="Liczba pomodoro">
            🍅 {task.pomodoro_count}
          </span>
        </div>
      )}
    </div>
  );
}

async function incrementPomodoro(task) {
  if (!task?.id) return;
  try {
    const next = (task.pomodoro_count || 0) + 1;
    const res = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pomodoro_count: next }),
    });
    if (res.ok) {
      task.pomodoro_count = next;
    }
  } catch (e) {
    console.error("Nie udało się zaktualizować pomodoro_count", e);
  }
}
