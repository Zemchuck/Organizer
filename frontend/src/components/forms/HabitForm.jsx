import React, { useState } from "react";
import "./HabitForm.css";

const API = import.meta.env.VITE_API_URL || "";
const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export default function HabitForm({ goalId, onCreated, onCancel }) {
  if (!goalId) return <div className="form-error">Najpierw wybierz cel.</div>;

  const [state, setState] = useState({
    title: "",
    start_date: "",
    time_of_day: "",
    duration: 25,
    repeat_until: "",
    repeat_days: [],
    color: "#7A7AE6", // domyślny – w pickerze będzie widoczny
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (i) =>
    setState((s) => {
      const set = new Set(s.repeat_days);
      set.has(i) ? set.delete(i) : set.add(i);
      return { ...s, repeat_days: [...set].sort((a, b) => a - b) };
    });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!state.title.trim()) return setError("Podaj nazwę nawyku.");
    if (!state.start_date)   return setError("Wybierz datę startu.");
    if (!state.time_of_day)  return setError("Wybierz godzinę.");

    try {
      setSaving(true);
      const payload = {
        title: state.title.trim(),
        goal_id: goalId,
        start_date: state.start_date,
        time_of_day: state.time_of_day,
        duration: Number(state.duration) || 25,
        repeat_until: state.repeat_until || null,
        repeat_days: state.repeat_days,
        color: state.color, // ⟵ zapisujemy dokładnie to, co widzisz
      };
      const res = await fetch(`${API}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      onCreated?.(created);

      setState({
        title: "", start_date: "", time_of_day: "",
        duration: 25, repeat_until: "", repeat_days: [], color: "#7A7AE6",
      });
    } catch (err) {
      console.error(err);
      setError("Nie udało się dodać nawyku.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="single-task-form" onSubmit={submit}>
      <h3>Dodaj nowy nawyk:</h3>

      <div className="form-group full">
        <label>
          Nazwa nawyku:<span className="req" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          value={state.title}
          onChange={(e) => setState({ ...state, title: e.target.value })}
          required
        />
      </div>

      <div className="row two">
        <div className="form-group">
          <label>
            Data <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            type="date"
            value={state.start_date}
            onChange={(e) => setState({ ...state, start_date: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>
            Godzina:<span className="req" aria-hidden="true">*</span>
          </label>
          <input
            type="time"
            value={state.time_of_day}
            onChange={(e) => setState({ ...state, time_of_day: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>
            Czas trwania (min):<span className="req" aria-hidden="true">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={state.duration}
            onChange={(e) => setState({ ...state, duration: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Kolor:</label>
          <div className="color-inline">
            <input
              type="color"
              value={state.color}
              onChange={(e) => setState({ ...state, color: e.target.value })}
              title="Wybierz kolor"
            />
            <span className="color-preview" style={{ background: state.color }} aria-hidden />
          </div>
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Powtarzaj do:</label>
          <input
            type="date"
            value={state.repeat_until}
            onChange={(e) => setState({ ...state, repeat_until: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Dni powtarzania:</label>
          <div className="dow-picker" role="group" aria-label="Dni tygodnia">
            {DOW.map((label, idx) => {
              const active = state.repeat_days.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`dow-btn ${active ? "active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleDay(idx)}
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
        <button type="button" className="submit-btn ghost" onClick={onCancel} disabled={saving}>
          Anuluj
        </button>
        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? "Zapisywanie…" : "➕ Dodaj"}
        </button>
      </div>
    </form>
  );
}
