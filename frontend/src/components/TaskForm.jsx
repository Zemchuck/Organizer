import React, { useState, useEffect, useRef } from "react";
import "./TaskForm.css";

const TASK_TYPES = [
  { value: "single", label: "Jednorazowe" },
  { value: "habit", label: "Nawyk" },
];

function TaskTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = TASK_TYPES.find((t) => t.value === value) || TASK_TYPES[0];
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="custom-select" ref={ref}>
      <button
        type="button"
        className="custom-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="custom-select-label">{selected.label}</span>
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul className="custom-select-list" role="listbox">
          {TASK_TYPES.map((t) => (
            <li
              key={t.value}
              role="option"
              aria-selected={t.value === value}
              className={"custom-select-item" + (t.value === value ? " active" : "")}
              onClick={() => { onChange(t.value); setOpen(false); }}
            >
              {t.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TaskForm({ defaultDate, defaultTime = "", onAdded, onClose }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ? defaultDate.toISOString().slice(0, 10) : "");
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState("single");
  const [color, setColor] = useState("#bb86fc");
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const week = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
  const toggleDay = (i) => setRepeatDays((p) => p.includes(i) ? p.filter((d) => d !== i) : [...p, i]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !date || !time || duration <= 0) {
      setError("Uzupełnij wszystkie pola."); return;
    }
    if (repeatOn) {
      if (!repeatDays.length) { setError("Zaznacz dni powtarzania."); return; }
      if (!repeatUntil)   { setError("Ustaw datę zakończenia."); return; }
      if (repeatUntil < date) { setError("Data zakończenia przed datą startu."); return; }
    }

    const payload = { title, date, time, duration, task_type: type, color };
    if (repeatOn) {
      payload.repeat_days = [...repeatDays].sort();
      payload.repeat_until = repeatUntil;
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Network");
      onAdded?.(await res.json());
      setTitle(""); setTime(""); setDuration(60);
      setRepeatOn(false); setRepeatDays([]); setRepeatUntil("");
      if (!defaultDate) setDate("");
      onClose?.();
    } catch {
      setError("Nie udało się zapisać zadania.");
    } finally { setLoading(false); }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label className="field-label">Tytuł zadania</label>
        <input type="text" className="title-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="row-main">
        <div className="form-group">
          <label className="field-label">Data rozpoczęcia</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="field-label">Godzina rozpoczęcia</label>
          <input type="time" className="time-input" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="field-label">Czas trwania (min)</label>
          <input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10)||0)} required />
        </div>
        <div className="form-group">
          <label className="field-label">Typ zadania</label>
          <TaskTypeDropdown value={type} onChange={setType} />
        </div>
        <div className="form-group">
          <label className="field-label">Kolor zadania</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ height: 'var(--field-height)', padding: 0, border: 'none', background: 'none' }} />
        </div>
        <div className="form-group repeat-inline">
          <label className="field-label">Powtarzać zadanie?</label>
          <label className="repeat-toggle">
            <input type="checkbox" checked={repeatOn} onChange={(e) => setRepeatOn(e.target.checked)} />{repeatOn?"Tak":"Nie"}
          </label>
        </div>
      </div>
      {repeatOn && (
        <div className="repeat-row">
          <div className="weekday-picker">
            {week.map((lbl,i)=>(
              <label key={i} className={"weekday-btn"+(repeatDays.includes(i)?" active":"")}>
                <input type="checkbox" checked={repeatDays.includes(i)} onChange={()=>toggleDay(i)} />{lbl}
              </label>
            ))}
          </div>
          <div className="form-group">
            <label className="field-label">Powtarzaj do</label>
            <input type="date" value={repeatUntil} onChange={e=>setRepeatUntil(e.target.value)} required />
          </div>
        </div>
      )}
      {error && <div className="task-error">{error}</div>}
      <div className="row-bottom">
        <button type="submit" className="submit-btn" disabled={loading}>{loading?"...":"Dodaj"}</button>
      </div>
    </form>
  );
}