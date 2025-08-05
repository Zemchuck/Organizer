// src/components/DayView.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./DayView.css";
import { toLocalISO } from "../helpers/date";

export default function DayView({ date }) {
  const isoDate = toLocalISO(date);
  const [tasks, setTasks] = useState([]);
  const [showHabits, setShowHabits] = useState(true);

  useEffect(() => { loadTasks(); }, [isoDate]);
  const loadTasks = async () => {
    const res = await fetch(`http://localhost:8000/tasks?start_date=${isoDate}&end_date=${isoDate}`);
    setTasks(res.ok ? await res.json() : []);
  };
  const toggleStatus = async (task) => {
    await fetch(`http://localhost:8000/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: !task.status }) });
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status: !t.status } : t)));
  };
  const deleteTask = async (id) => {
    await fetch(`http://localhost:8000/tasks/${id}`, { method: "DELETE" });
    setTasks((p) => p.filter((t) => t.id !== id));
  };

  const hours       = useMemo(() => [...Array(24).keys()], []);
  const fieldHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--field-height"));
  const display     = tasks.filter((t) => showHabits || t.task_type !== "habit");

  return (
    <>
      <button className="habit-toggle-btn" onClick={() => setShowHabits((v) => !v)}>{showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}</button>
      <div className="day-grid">
        <div className="corner" />
        <div className="day-header">{date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</div>
        {hours.map((h) => <div key={h} className="hour-label" style={{ gridColumn: 1, gridRow: h + 2 }}>{h}:00</div>)}
        {hours.map((h) => (
          <div key={h} className="day-cell" style={{ gridColumn: 2, gridRow: h + 2 }}>
            {display.filter((t) => new Date(t.time).getHours() === h).map((task) => {
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
        ))}
      </div>
    </>
  );
}