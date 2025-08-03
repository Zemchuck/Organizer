import React, { useEffect, useMemo, useState } from "react";
import "./WeekView.css";

const mondayOf = (date) => {
  const d = new Date(date);
  const dow = d.getDay() || 7;
  if (dow !== 1) d.setDate(d.getDate() - dow + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function WeekView({ date, enterDayView }) {
  const monday = useMemo(() => mondayOf(date), [date]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      }),
    [monday]
  );
  const [tasks, setTasks] = useState([]);
  const [showHabits, setShowHabits] = useState(true);

  useEffect(() => {
    const start = monday.toISOString().slice(0, 10);
    const endDate = new Date(monday);
    endDate.setDate(monday.getDate() + 6);
    const end = endDate.toISOString().slice(0, 10);
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/tasks?start_date=${start}&end_date=${end}`
        );
        const data = await res.json();
        setTasks(data);
      } catch {
        setTasks([]);
      }
    })();
  }, [monday]);

  const tasksByDate = useMemo(() => {
    const map = Object.fromEntries(days.map((d) => [d.toISOString().slice(0, 10), []]));
    tasks.forEach((t) => {
      const key = new Date(t.time).toISOString().slice(0, 10);
      if (map[key]) map[key].push(t);
    });
    return map;
  }, [tasks, days]);

  const hours = useMemo(() => [...Array(24).keys()], []);

  return (
    <>
      <button className="habit-toggle-btn" onClick={() => setShowHabits((v) => !v)}>
        {showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}
      </button>
      <div className="week-grid">
        <div className="corner"></div>

        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isWeekend = i >= 5;
          const isToday = iso === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={iso}
              className={`day-header${isWeekend ? " weekend" : ""}${isToday ? " today" : ""}`}
              style={{ gridColumn: i + 2, gridRow: 1 }}
              onClick={() => enterDayView?.(d)}
            >
              <div className="day-date">
                {d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
              </div>
              <div className="day-name">
                {d.toLocaleDateString("pl-PL", { weekday: "short" })}
              </div>
            </div>
          );
        })}

        {hours.map((h, i) => (
          <div key={h} className="hour-label" style={{ gridColumn: 1, gridRow: i + 2 }}>
            {h}:00
          </div>
        ))}

        {days.map((d, di) =>
          hours.map((h, hi) => (
            <div
              key={`${di}-${hi}`}
              className="day-cell"
              style={{ gridColumn: di + 2, gridRow: hi + 2 }}
            >
              {tasksByDate[d.toISOString().slice(0, 10)]
                .filter(
                  (t) => new Date(t.time).getHours() === h && (showHabits || t.task_type !== "habit")
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className="task-bar"
                    style={{ backgroundColor: task.color, color: "var(--graphite)" }}
                  >
                    {task.title}
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
