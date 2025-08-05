import React, { useState, useEffect, useRef } from "react";
import "./TaskForm.css";

const TASK_TYPES = [
  { value: "single", label: "Jednorazowe" },
  { value: "habit", label: "Nawyk" },
];

const TASK_COLORS = [
  "#40E0D0", "#BB86FC", "#FF6B6B", "#FFA500",
  "#00BFFF", "#32CD32", "#FFD700", "#FF1493",
  "#7FFF00", "#FF4500", "#8A2BE2", "#708090"
];

const PRIORITY_COLORS = [
  { value: 1, label: "Pilne i Ważne", color: "#ff4c4c" },
  { value: 2, label: "Ważne, ale Niepilne", color: "#ffa500" },
  { value: 3, label: "Pilne, ale Nieważne", color: "#40e0d0" },
  { value: 4, label: "Niepilne i Nieważne", color: "#9ca3af" },
];

function TaskTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = TASK_TYPES.find((t) => t.value === value) || TASK_TYPES[0];
  const ref = useRef();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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
        {selected.label}
        <span className="arrow">▾</span>
      </button>
      {open && (
        <ul className="custom-select-list" role="listbox">
          {TASK_TYPES.map((t) => (
            <li
              key={t.value}
              role="option"
              aria-selected={t.value === value}
              className={t.value === value ? "active" : ""}
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
  const [description, setDescription] = useState("");
  // ✅ zamiast toISOString → toLocaleDateString("en-CA") (format YYYY-MM-DD bez przesunięć)
  const [date, setDate] = useState(defaultDate ? defaultDate.toLocaleDateString("en-CA") : "");
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState("single");
  const [color, setColor] = useState(TASK_COLORS[0]);
  const [priority, setPriority] = useState(2);
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showColors, setShowColors] = useState(false);
  const [showPriority, setShowPriority] = useState(false);

  const week = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
  const toggleDay = (i) => {
    setRepeatDays((prev) => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !date || !time || duration <= 0) {
      setError("Uzupełnij wszystkie pola.");
      return;
    }
    if (repeatOn) {
      if (!repeatDays.length) { setError("Zaznacz dni powtarzania."); return; }
      if (!repeatUntil) { setError("Ustaw datę zakończenia."); return; }
      if (new Date(repeatUntil) < new Date(date)) { setError("Data zakończenia przed datą startu."); return; }
    }

    const payload = { title, description, date, time, duration, task_type: type, color, priority };
    if (repeatOn) { payload.repeat_days = repeatDays; payload.repeat_until = repeatUntil; }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("Błąd API:", res.status, await res.text());
        throw new Error("Błąd zapisu");
      }

      onAdded && onAdded(await res.json());
      // ✅ reset formularza
      setTitle(""); setDescription(""); setTime(""); setDuration(60);
      setRepeatOn(false); setRepeatDays([]); setRepeatUntil("");
      if (!defaultDate) setDate("");
      onClose && onClose();

    } catch (err) {
      console.error("Fetch error:", err);
      setError("Nie udało się zapisać zadania.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label className="field-label">Tytuł zadania</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="form-group full">
        <label className="field-label">Opis</label>
        <textarea className="title-field" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="row-main">
        <div className="form-group">
          <label className="field-label">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="field-label">Godzina</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="field-label">Czas trwania (min)</label>
          <input type="number" min="1" value={duration} onChange={e => setDuration(+e.target.value)} />
        </div>
        <div className="form-group">
          <label className="field-label">Typ zadania</label>
          <TaskTypeDropdown value={type} onChange={setType} />
        </div>
        <div className="form-group">
          <label className="field-label">Priorytet</label>
          <div className="dropdown-color">
            <div
              className="color-selected priority"
              style={{ backgroundColor: PRIORITY_COLORS.find(p => p.value === priority).color }}
              onClick={() => setShowPriority(v => !v)}
            >
              {priority}
            </div>
            {showPriority &&
              <div className="color-options priority-dropdown">
                {PRIORITY_COLORS.map(p =>
                  <div key={p.value}
                       className="color-option"
                       style={{ backgroundColor: p.color }}
                       onClick={() => { setPriority(p.value); setShowPriority(false); }}>
                    {p.value}
                  </div>
                )}
              </div>}
          </div>
        </div>
        <div className="form-group">
          <label className="field-label">Kolor zadania</label>
          <div className="dropdown-color">
            <div className="color-selected" style={{ backgroundColor: color }} onClick={() => setShowColors(v => !v)} />
            {showColors &&
              <div className="color-options">
                {TASK_COLORS.map(c =>
                  <div key={c} className="color-option" style={{ backgroundColor: c }}
                       onClick={() => { setColor(c); setShowColors(false); }} />
                )}
              </div>}
          </div>
        </div>
        <div className="form-group repeat-inline">
          <label className="field-label">Powtarzać?</label>
          <input type="checkbox" checked={repeatOn} onChange={e => setRepeatOn(e.target.checked)} />
        </div>
      </div>

      {repeatOn && (
        <div className="repeat-row">
          <div className="weekday-picker">
            {week.map((lbl, i) =>
              <button type="button" key={i}
                      className={repeatDays.includes(i) ? "weekday-btn active" : "weekday-btn"}
                      onClick={() => toggleDay(i)}>
                {lbl}
              </button>
            )}
          </div>
          <div className="form-group">
            <label className="field-label">Powtarzaj do</label>
            <input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} />
          </div>
        </div>
      )}

      {error && <div className="task-error">{error}</div>}

      <div className="row-bottom">
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "..." : "Dodaj"}
        </button>
      </div>
    </form>
  );
}