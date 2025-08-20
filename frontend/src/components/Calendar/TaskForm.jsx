import React, { useEffect, useState } from "react";
import "./TaskForm.css";

const API = import.meta.env.VITE_API_URL || "/api";
const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const today = () => new Date().toISOString().slice(0, 10);

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) {
    const msg = text.slice(0, 180) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!ct.includes("application/json")) throw new Error(`API zwróciło ${ct}`);
  return JSON.parse(text || "null");
}

export default function TaskForm({ initialDate, onCreated, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errFetch, setErrFetch] = useState("");

  const [state, setState] = useState({
    project_id: "",
    title: "",
    date: initialDate || today(),
    time: "09:00",
    duration: 60,
    color: "#59c1ff",
    repeat_until: "",
    repeat_days: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/projects`, { headers: { Accept: "application/json" } });
        const ct = r.headers.get("content-type") || "";
        const text = await r.text();
        const data = ct.includes("application/json") ? JSON.parse(text || "null") : null;
        setProjects(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setErrFetch("Nie udało się pobrać listy projektów.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleDay = (i) => {
    setState((s) => {
      const set = new Set(s.repeat_days);
      set.has(i) ? set.delete(i) : set.add(i);
      return { ...s, repeat_days: [...set].sort((a, b) => a - b) };
    });
  };

  function buildPayload() {
    const title = state.title.trim();
    const date = state.date;
    let time = state.time;
    const duration = Number(state.duration);

    if (!title) throw new Error("Podaj nazwę zadania.");
    if (!date) throw new Error("Wybierz datę.");
    if (!time) throw new Error("Wybierz godzinę.");
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440)
      throw new Error("Czas trwania musi być 1–1440 min.");

    if (/^\d{2}:\d{2}$/.test(time)) time = `${time}:00`;

    const payload = { title, date, time, duration, task_type: "single" };
    if (state.color) payload.color = state.color;
    if (state.project_id) payload.project_id = Number(state.project_id);
    if (state.repeat_days.length) {
      payload.repeat_days = state.repeat_days;
      if (state.repeat_until) payload.repeat_until = state.repeat_until;
    }
    return payload;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = buildPayload();
      setSaving(true);
      const created = await postJSON(`${API}/tasks`, payload);
      onCreated?.(created);
      onCancel?.();
    } catch (e) {
      console.error(e);
      setError(String(e.message || "Nie udało się dodać zadania."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <h3>Nowe zadanie</h3>

      {errFetch && <div className="form-error">{errFetch}</div>}

      <div className="row two">
        <div className="form-group">
          <label>Projekt <span style={{ opacity: .7 }}>(opcjonalnie)</span></label>
          <select
            value={state.project_id}
            onChange={(e) => setState({ ...state, project_id: e.target.value })}
            disabled={loading}
          >
            <option value="">— bez projektu —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Nazwa zadania *</label>
          <input
            type="text"
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
            placeholder="np. Telefon do klienta"
            required
          />
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Data *</label>
          <input
            type="date"
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Godzina *</label>
          <input
            type="time"
            value={state.time}
            onChange={(e) => setState({ ...state, time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="row two">
        <div className="form-group">
          <label>Czas trwania (min) *</label>
          <input
            type="number"
            min="1"
            max="1440"
            value={state.duration}
            onChange={(e) => setState({ ...state, duration: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Kolor (opcjonalnie)</label>
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
          <label>Dni powtarzania (opcjonalnie)</label>
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
        <button type="button" className="submit-btn ghost" onClick={onCancel} disabled={saving}>
          Anuluj
        </button>
        <button className="submit-btn" disabled={saving}>
          {saving ? "Zapisywanie…" : "➕ Dodaj"}
        </button>
      </div>
    </form>
  );
}
