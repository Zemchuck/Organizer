import React, { useEffect, useMemo, useState } from "react";
import "./MonthView.css";

const API = import.meta.env.VITE_API_URL || "/api";

const fmt = (d) => d.toISOString().slice(0, 10);
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d) => { const nd = new Date(d); const w = (nd.getDay() + 6) % 7; nd.setDate(nd.getDate() - w); nd.setHours(0, 0, 0, 0); return nd; };
const endOfWeek = (d) => { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return e; };

export default function MonthView({ initialDate, onAdd }) {
  const [anchor] = useState(() => initialDate ? new Date(initialDate) : new Date());
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [showHabits, setShowHabits] = useState(true);
  const [selected, setSelected] = useState(null);

  // zakres siatki (pełne tygodnie)
  const grid = useMemo(() => {
    const first = firstOfMonth(anchor);
    const last = lastOfMonth(anchor);
    const start = startOfWeek(first);
    const end = endOfWeek(last);
    const days = [];
    const cur = new Date(start);
    while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return { start, end, days };
  }, [anchor]);

  // dane
  useEffect(() => {
    (async () => {
      const r = await fetch(`${API}/tasks?start_date=${fmt(grid.start)}&end_date=${fmt(grid.end)}`);
      setTasks((await r.json()) || []);
    })().catch(console.error);
  }, [grid.start, grid.end]);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${API}/habits`);
      setHabits((await r.json()) || []);
    })().catch(console.error);
  }, []);

  // mapowanie pozycji do dni
  const itemsByDay = useMemo(() => {
    const m = {};
    for (const t of tasks) {
      if (!t?.time) continue;
      const key = String(t.time).slice(0, 10);
      (m[key] ||= []).push({ id: `task-${t.id}`, type: "task", title: t.title, color: t.color || "#7aa7ff" });
    }
    if (showHabits) {
      for (const day of grid.days) {
        for (const h of habits) {
          if (h?.active === false) continue;
          const start = new Date(h.start_date + "T00:00:00");
          const until = h.repeat_until ? new Date(h.repeat_until + "T23:59:59") : null;
          if (day < start) continue;
          if (until && day > until) continue;
          const wd = day.getDay() === 0 ? 6 : day.getDay() - 1;
          const list = Array.isArray(h.repeat_days) ? h.repeat_days : [];
          if (!list.includes(wd)) continue;
          const key = fmt(day);
          (m[key] ||= []).push({ id: `habit-${h.id}-${key}`, type: "habit", title: h.title, color: h.color || "#6fead1" });
        }
      }
    }
    return m;
  }, [tasks, habits, grid.days, showHabits]);

  return (
    <div className="month-shell">
      {/* actions w stylu WeekView, szerokość = var(--cal-width) */}
      <div className="month-toolbar">
        <div />
        <div className="right-actions">
          <button className="btn ghost" onClick={() => setShowHabits(v => !v)}>
            {showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}
          </button>
        </div>
      </div>

      {/* karta siatki miesiąca — bez widoku tabeli */}
      <div className="month-grid-card">
        <div className="month-grid-head">
          {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => (
            <div key={d} className="head-cell">{d}</div>
          ))}
        </div>

        <div className="month-grid-body">
          {grid.days.map((d) => {
            const key = fmt(d);
            const items = (itemsByDay[key] || []).slice(0, 6);
            const sel = selected === key;
            const other = d.getMonth() !== anchor.getMonth();
            return (
              <div
                key={key}
                className={`day-cell ${other ? "muted" : ""} ${sel ? "selected" : ""}`}
                onClick={() => setSelected(key)}
                onDoubleClick={() => onAdd?.(key)}
              >
                <div className="day-top">
                  <span className="num">{d.getDate()}</span>
                  <button
                    className="mini-add"
                    title="Dodaj"
                    onClick={(e) => { e.stopPropagation(); onAdd?.(key); }}
                  >+</button>
                </div>

                <div className="mini-items">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className={`mini-block ${it.type}`}
                      title={it.title}
                      style={{ background: it.color }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
