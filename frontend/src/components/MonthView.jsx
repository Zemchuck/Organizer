// src/components/MonthView.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./MonthView.css";
import { toLocalISO } from "../helpers/date";

const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function MonthView({ date, enterDayView }) {
  /* ---------- SIATKA DNI ---------- */
  const firstDay    = useMemo(() => firstOfMonth(date), [date]);
  const lastDay     = useMemo(() => lastOfMonth(date),  [date]);
  const startOffset = (firstDay.getDay() + 6) % 7; // pon = 0

  const daysArray = useMemo(() => {
    const total = startOffset + lastDay.getDate();
    const rows  = Math.ceil(total / 7) * 7;
    return Array.from({ length: rows }, (_, i) => {
      const num = i - startOffset + 1;
      return num > 0 && num <= lastDay.getDate() ? num : null;
    });
  }, [startOffset, lastDay]);

  /* ---------- TASKI ---------- */
  const [tasks, setTasks] = useState([]);
  const [showHabits, setShowHabits] = useState(true);

  useEffect(() => {
    const startISO = toLocalISO(firstDay);
    const endISO   = toLocalISO(lastDay);
    (async () => {
      try {
        const res = await fetch(`http://localhost:8000/tasks?start_date=${startISO}&end_date=${endISO}`);
        setTasks(await res.json());
      } catch { setTasks([]); }
    })();
  }, [firstDay, lastDay]);

  const todayISO   = toLocalISO(new Date());
  const taskCounts = useMemo(() => {
    const map = {};
    tasks
      .filter((t) => showHabits || t.task_type !== "habit")
      .forEach((t) => {
        const key = toLocalISO(new Date(t.time));
        map[key] = (map[key] || 0) + 1;
      });
    return map;
  }, [tasks, showHabits]);

  /* ---------- RENDER ---------- */
  return (
    <>
      <button className="habit-toggle-btn" onClick={() => setShowHabits((v) => !v)}>
        {showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}
      </button>

      <div className="month-grid">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => (
          <div key={d} className="month-head">
            {d}
          </div>
        ))}

        {daysArray.map((num, idx) => {
          const cellDate = num ? new Date(date.getFullYear(), date.getMonth(), num) : null;
          const iso      = cellDate && toLocalISO(cellDate);
          const count    = iso ? taskCounts[iso] : 0;
          const isToday  = iso === todayISO;
          return (
            <div
              key={idx}
              className={
                `month-cell ${num ? "" : "empty"} ${isToday ? "today" : ""}`
              }
              onClick={() => iso && enterDayView(cellDate)}
            >
              {num}
              {count > 0 && <span className="task-count">{count}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}