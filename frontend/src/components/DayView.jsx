import React, { useEffect, useMemo, useState } from "react";
import "./DayView.css";
import { toLocalISO } from "../helpers/date";
import TaskPopover from "./TaskPopover";

export default function DayView({ date }) {
  const iso = toLocalISO(date);
  const [tasks, setTasks] = useState([]);
  const [showHabits, setShowHabits] = useState(true);
  const [popoverTask, setPopoverTask] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    (async () => {
      const r = await fetch(`http://localhost:8000/tasks?start_date=${iso}&end_date=${iso}`);
      setTasks(r.ok ? await r.json() : []);
    })();
  }, [iso]);

  const toggleStatus = async (t) => {
    await fetch(`http://localhost:8000/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: !t.status })
    });
    setTasks(p => p.map(x => x.id === t.id ? { ...x, status: !x.status } : x));
  };

  const remove = async (t, series) => {
    await fetch(`http://localhost:8000/tasks/${t.id}${series ? "?series=true" : ""}`, { method: "DELETE" });
    setTasks(p => series
      ? p.filter(x => !(x.title === t.title && x.task_type === t.task_type))
      : p.filter(x => x.id !== t.id));
    setPopoverTask(null);
  };

  const hours = useMemo(() => [...Array(24).keys()], []);
  const fieldH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--field-height"));
  const visibleTasks = tasks.filter(t => showHabits || t.task_type !== "habit");

  return (
    <>
      <button className="habit-toggle-btn" onClick={() => setShowHabits(v => !v)}>
        {showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}
      </button>
      <div className="day-grid" onClick={() => setPopoverTask(null)}>
        <div className="corner" />
        <div className="day-header">
          {date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
        </div>

        {hours.map(h => (
          <div key={h} className="hour-label" style={{ gridColumn: 1, gridRow: h + 2 }}>
            {h}:00
          </div>
        ))}

        {hours.map(h => (
          <div key={h} className="day-cell" style={{ gridColumn: 2, gridRow: h + 2 }}>
            {visibleTasks.filter(t => new Date(t.time).getHours() === h).map(t => {
              const s = new Date(t.time);
              const top = (s.getMinutes() / 60) * fieldH;
              const height = Math.ceil(t.duration / 60) * fieldH;
              return (
                <div
                  key={t.id}
                  className={`task-block${t.status ? " completed" : ""}${t.task_type === "habit" ? " habit-task" : ""}`}
                  style={{ backgroundColor: t.color, top: `${top}px`, height: `${height}px` }}
                  onClick={e => { e.stopPropagation(); setPopoverTask(t); setPopoverPos({ x: e.clientX, y: e.clientY }); }}
                >
                  <span className="task-title">{t.title}</span>
                  <input type="checkbox" checked={t.status} onChange={() => toggleStatus(t)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <TaskPopover
        task={popoverTask}
        position={popoverPos}
        onClose={() => setPopoverTask(null)}
        onDelete={t => remove(t, false)}
        onDeleteSeries={t => remove(t, true)}
      />
    </>
  );
}