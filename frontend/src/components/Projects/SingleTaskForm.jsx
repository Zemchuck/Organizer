import React, { useState } from "react";
import "./SingleTaskForm.css";

const API = import.meta.env.VITE_API_URL || "";
const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export default function SingleTaskForm({ projectId, onCreated, onCancel }) {
  if (!projectId) {
    return <div className="form-error">Najpierw wybierz projekt.</div>;
  }

  const [state, setState] = useState({
    title: "",
    date: "",
    time: "",
    duration: 60,
    color: "#CCCCCC",
    repeat_until: "",
    repeat_days: [], // 0..6 – jeśli niepusta i repeat_until → tworzymy serię
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (i) => {
    setState((s) => {
      const set = new Set(s.repeat_days);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      return { ...s, repeat_days: [...set].sort((a, b) => a - b) };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!state.title.trim()) return setError("Podaj nazwę zadania.");

    const hasSeries = state.repeat_days.length > 0 && !!state.repeat_until;
    if (hasSeries) {
      if (!state.date || !state.time)
        return setError("Seria wymaga daty i godziny startu.");
    } else {
      if ((state.date && !state.time) || (!state.date && state.time))
        return setError("Podaj jednocześnie datę i godzinę (albo zostaw oba puste).");
    }

    setSaving(true);
    try {
      const payload = {
        title: state.title.trim(),
        project_id: projectId,
        duration: Number(state.duration) || 60,
        color: state.color || "#CCCCCC",
        date: state.date || null,
        time: state.time || null,
        repeat_days: state.repeat_days.length ? state.repeat_days : null,
        repeat_until: state.repeat_until || null,
      };

      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json(); // obiekt lub lista (seria)
      onCreated?.(created);
      setState({
        title: "",
        date: "",
        time: "",
        duration: 60,
        color: "#CCCCCC",
        repeat_until: "",
        repeat_days: [],
      });
    } catch (err) {
      console.error(err);
      setError("Nie udało się dodać zadania.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="single-task-form" onSubmit={submit}>
      <h3>Nowe zadanie w projekcie</h3>

      <div className="form-group full">
        <label>Nazwa zadania</label>
        <input
          value={state.title}
          onChange={(e) => setState({ ...state, title: e.target.value })}
          required
        />
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Data (opcjonalnie)</label>
          <input
            type="date"
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Godzina (opcjonalnie)</label>
          <input
            type="time"
            value={state.time}
            onChange={(e) => setState({ ...state, time: e.target.value })}
          />
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Czas trwania (min)</label>
          <input
            type="number"
            min="1"
            value={state.duration}
            onChange={(e) => setState({ ...state, duration: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Kolor</label>
          <input
            type="color"
            value={state.color}
            onChange={(e) => setState({ ...state, color: e.target.value })}
          />
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Powtarzaj do (opcjonalnie)</label>
          <input
            type="date"
            value={state.repeat_until}
            onChange={(e) => setState({ ...state, repeat_until: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Dni powtarzania</label>
          <div className="dow-picker">
            {DOW.map((label, idx) => {
              const active = state.repeat_days.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`dow-btn ${active ? "active" : ""}`}
                  onClick={() => toggleDay(idx)}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="row-bottom">
        <button className="submit-btn" disabled={saving}>
          {saving ? "Zapisywanie…" : "➕ Dodaj zadanie"}
        </button>
        <button type="button" className="submit-btn ghost" onClick={onCancel} disabled={saving}>
          ✕ Anuluj
        </button>
      </div>
    </form>
  );
}
