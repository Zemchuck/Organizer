// src/components/WeekView.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./WeekView.css";
import { toLocalISO, mondayOf } from "../helpers/date";

export default function WeekView({ date, enterDayView, showHabits = true }) {
  const monday = useMemo(() => mondayOf(date), [date]);
  const days   = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);

  const [tasks, setTasks] = useState([]);
  useEffect(() => { loadTasks(); }, [monday]);

  async function loadTasks() {
    const startISO = toLocalISO(monday);
    const endISO   = toLocalISO(new Date(monday.getTime() + 6 * 86400000));
    const res = await fetch(`http://localhost:8000/tasks?start_date=${startISO}&end_date=${endISO}`);
    setTasks(res.ok ? await res.json() : []);
  }
  const toggleStatus = async (task) => {
    await fetch(`http://localhost:8000/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: !task.status }),
    });
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status: !t.status } : t)));
  };
  const deleteTask = async (id) => {
    await fetch(`http://localhost:8000/tasks/${id}`, { method: "DELETE" });
    setTasks((p) => p.filter((t) => t.id !== id));
  };

  const tasksByDate = useMemo(() => {
    const map = Object.fromEntries(days.map((d) => [toLocalISO(d), []]));
    tasks.forEach((t) => {
      const key = toLocalISO(new Date(t.time));
      if (map[key]) map[key].push(t);
    });
    return map;
  }, [tasks, days]);

  const hours       = useMemo(() => [...Array(24).keys()], []);
  const fieldHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--field-height"));

  return (
    <div className="week-grid">
      {/* Nagłówki dni */}
      {days.map((d, i) => (
        <div key={i} className="week-day-header" style={{ gridColumn: i + 2, gridRow: 1 }} onClick={() => enterDayView(d)}>
          {d.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      ))}

      {/* Godziny */}
      {hours.map((h) => (
        <div key={h} className="hour-label" style={{ gridColumn: 1, gridRow: h + 2 }}>{h}:00</div>
      ))}

      {/* Komórki z zadaniami */}
      {days.map((d, dayIdx) => {
        const iso  = toLocalISO(d);
        const list = tasksByDate[iso].filter((t) => showHabits || t.task_type !== "habit");
        return hours.map((h) => (
          <div key={`${iso}-${h}`} className="week-cell" style={{ gridColumn: dayIdx + 2, gridRow: h + 2 }}>
            {list.filter((t) => new Date(t.time).getHours() === h).map((task) => {
              const start  = new Date(task.time);
              const top    = (start.getMinutes() / 60) * fieldHeight;
              const height = Math.ceil(task.duration / 60) * fieldHeight;
              return (
                <div key={task.id} className={`task-block ${task.status ? "completed" : ""}`} style={{ backgroundColor: task.color, top: `${top}px`, height: `${height}px` }}>
                  <label className="task-label">
                    <input type="checkbox" checked={task.status} onChange={() => toggleStatus(task)} />
                    <span className="task-title">{task.title}</span>
                    <button type="button" className="delete-btn" onClick={() => deleteTask(task.id)}>
                      🗑 <span>Usuń</span>
                    </button>
                    {task.description && <span className="task-desc">{task.description}</span>}
                  </label>
                </div>
              );
            })}
          </div>
        ));
      })}
    </div>
  );
}