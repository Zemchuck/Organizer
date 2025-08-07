import React, { useEffect, useMemo, useState } from "react";
import "./WeekView.css";
import { toLocalISO, mondayOf } from "../helpers/date";
import TaskPopover from "./TaskPopover";

export default function WeekView({ date, enterDayView }) {
  const monday = useMemo(() => mondayOf(date), [date]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  }), [monday]);

  const [showHabits, setShowHabits] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [popoverTask, setPopoverTask] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  useEffect(() => { load(); }, [monday]);
  const load = async () => {
    const r = await fetch(`http://localhost:8000/tasks?start_date=${toLocalISO(monday)}&end_date=${toLocalISO(new Date(monday.getTime() + 6 * 864e5))}`);
    setTasks(r.ok ? await r.json() : []);
  };

  const toggleStatus = async (t) => { await fetch(`http://localhost:8000/tasks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: !t.status }) }); setTasks(p => p.map(x => x.id === t.id ? { ...x, status: !x.status } : x)); };
  const del = async (t, series) => { await fetch(`http://localhost:8000/tasks/${t.id}${series ? "?series=true" : ""}`, { method: "DELETE" }); setTasks(p => series ? p.filter(x => !(x.title === t.title && x.task_type === t.task_type)) : p.filter(x => x.id !== t.id)); setPopoverTask(null); };

  const grouped = useMemo(() => { const m = Object.fromEntries(days.map(d => [toLocalISO(d), []])); tasks.forEach(t => { const k = toLocalISO(new Date(t.time)); if (m[k]) m[k].push(t); }); return m; }, [tasks, days]);

  const hours = [...Array(24).keys()];
  const field = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--field-height"));

  return (<>
    <button className="habit-toggle-btn" onClick={() => setShowHabits(v => !v)}>{showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}</button>
    <div className="week-grid" onClick={() => setPopoverTask(null)}>
      {days.map((d, i) => (<div key={i} className="week-day-header" style={{ gridColumn: i + 2, gridRow: 1 }} onClick={() => enterDayView(d)}>{d.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}</div>))}
      {hours.map(h => (<div key={h} className="hour-label" style={{ gridColumn: 1, gridRow: h + 2 }}>{h}:00</div>))}
      {days.map((d, di) => hours.map(h => {
        const iso = toLocalISO(d);
        return (<div key={`${iso}-${h}`} className="week-cell" style={{ gridColumn: di + 2, gridRow: h + 2 }}>
          {grouped[iso].filter(t => showHabits || t.task_type !== "habit").filter(t => new Date(t.time).getHours() === h).map(t => {
            const s = new Date(t.time); const top = (s.getMinutes() / 60) * field; const ht = Math.ceil(t.duration / 60) * field;
            return (<div key={t.id} className={`task-block${t.status ? " completed" : ""}${t.task_type === "habit" ? " habit-task" : ""}`} style={{ backgroundColor: t.color, top: `${top}px`, height: `${ht}px` }}
              onClick={e => { e.stopPropagation(); setPopoverTask(t); setPopoverPos({ x: e.clientX, y: e.clientY }); }}>
              <span className="task-title">{t.title}</span>
              <input type="checkbox" checked={t.status} onChange={() => toggleStatus(t)} />
            </div>);
          })}
        </div>);
      }))}
    </div>
    <TaskPopover task={popoverTask} position={popoverPos} onClose={() => setPopoverTask(null)} onDelete={(t) => del(t, false)} onDeleteSeries={(t) => del(t, true)} onEdit={(t) => alert("Edytuj " + t.title)} onEditSeries={(t) => alert("Edytuj serię " + t.title)} />
  </>);
}