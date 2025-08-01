import React, { useEffect, useMemo, useState } from "react";
import "./WeekView.css";

const mondayOf = (date) => {
  const d = new Date(date);
  const dow = d.getDay() || 7; // nd=7
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

  /* ---- fetch wszystkie zadania tygodnia ---- */
  useEffect(() => {
    const start = monday.toISOString().slice(0, 10);
    const end = new Date(monday);
    end.setDate(monday.getDate() + 6);
    const endISO = end.toISOString().slice(0, 10);

    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/tasks?start_date=${start}&end_date=${endISO}`
        );
        const data = await res.json();
        setTasks(data);
      } catch (e) {
        console.error(e);
        setTasks([]);
      }
    })();
  }, [monday]);

  /* ---- grupowanie: ISO-date → [] ---- */
  const tasksByDate = useMemo(() => {
    const map = Object.fromEntries(
      days.map((d) => [d.toISOString().slice(0, 10), []])
    );
    tasks.forEach((t) => {
      const key = new Date(t.time).toISOString().slice(0, 10);
      map[key]?.push(t);
    });
    return map;
  }, [tasks, days]);

  const hours = useMemo(() => [...Array(24).keys()], []);

  /* ---------- render ---------- */
  return (
    <>
      <button
        className="habit-toggle-btn"
        onClick={() => setShowHabits((v) => !v)}
      >
        {showHabits ? "Ukryj nawyki" : "Pokaż nawyki"}
      </button>

      <div className="week-grid">
        {/* lewy górny róg */}
        <div className="corner"></div>

        {/* nagłówki dni */}
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString("pl-PL", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          });
          const isWeekend = i >= 5;
          const isToday = iso === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={iso}
              className={
                "day-header" +
                (isWeekend ? " weekend" : "") +
                (isToday ? " today" : "")
              }
              style={{ gridColumn: i + 2, gridRow: 1 }}
              onClick={() => enterDayView?.(d)}
            >
              {label}
            </div>
          );
        })}

        {/* etykiety godzin */}
        {hours.map((h) => (
          <div
            key={"h" + h}
            className="hour-label"
            style={{ gridColumn: 1, gridRow: h + 2 }}
          >
            {h}:00
          </div>
        ))}

        {/* komórki 7×24 */}
        {days.flatMap((d, col) => {
          const iso = d.toISOString().slice(0, 10);
          const isTodayCol =
            iso === new Date().toISOString().slice(0, 10);

          return hours.map((h) => (
            <div
              key={iso + "-" + h}
              className={
                "day-cell" +
                (isTodayCol && h === new Date().getHours()
                  ? " today"
                  : "")
              }
              style={{ gridColumn: col + 2, gridRow: h + 2 }}
            >
              {tasksByDate[iso]
                .filter(
                  (t) =>
                    new Date(t.time).getHours() === h &&
                    (showHabits || t.task_type !== "habit")
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className={`task-bar ${task.task_type}`}
                  >
                    {task.title}
                  </div>
                ))}
            </div>
          ));
        })}
      </div>
    </>
  );
}