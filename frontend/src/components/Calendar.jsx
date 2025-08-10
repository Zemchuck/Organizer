import React, { useEffect, useMemo, useState } from "react";
import DayView from "./DayView.jsx";
import WeekView from "./WeekView.jsx";
import TaskPopover from "./TaskPopover.jsx";
import MonthView from "./MonthView.jsx";
import "./Calendar.css";
import { toLocalISO, mondayOf } from "../helpers/date.js";

const API = import.meta.env.VITE_API_URL || "";

/* ===== helpers – lokalny YYYY-MM-DD i tydzień od poniedziałku ===== */
const fmt = (d) => toLocalISO(d); // ⟵ lokalny, bez przesunięć UTC
const startOfWeek = (d) => mondayOf(d);
const endOfWeek = (d) => {
  const s = mondayOf(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

export default function Calendar() {
  const [view, setView] = useState("week");                // 'day' | 'week' | 'month'
  const [date, setDate] = useState(fmt(new Date()));       // YYYY-MM-DD (lokalnie)
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popoverDate, setPopoverDate] = useState(null);

  // zakres do pobrania zadań
  const [range, setRange] = useState({ start: null, end: null });

  useEffect(() => {
    const d = new Date(date); // 'YYYY-MM-DD' -> lokalna data
    if (view === "day") {
      setRange({ start: fmt(d), end: fmt(d) });
      return;
    }
    if (view === "week") {
      const s = startOfWeek(d), e = endOfWeek(d);
      setRange({ start: fmt(s), end: fmt(e) });
      return;
    }
    // dla month nie pobieramy tutaj — MonthView ma własne pobieranie
    setRange({ start: null, end: null });
  }, [view, date]);

  // pobierz taski w zakresie (dzień/tydzień)
  useEffect(() => {
    if (!range.start || !range.end) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/tasks?start_date=${range.start}&end_date=${range.end}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [range.start, range.end]);

  // pobierz nawyki (raz — używa Day/Week; MonthView ma własne)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/habits`);
        const h = await r.json();
        setHabits(Array.isArray(h) ? h : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // helpery do nawigacji po czasie (zwracają lokalny YYYY-MM-DD)
  const fmtAdd = (dStr, deltaDays) => {
    const d = new Date(dStr);
    d.setDate(d.getDate() + deltaDays);
    return fmt(d);
  };
  const addDays = (dStr, delta) => fmtAdd(dStr, delta);
  const addWeeks = (dStr, delta) => fmtAdd(dStr, 7 * delta);
  const addMonths = (dStr, delta) => {
    const d = new Date(dStr);
    d.setMonth(d.getMonth() + delta);
    return fmt(d);
  };

  const onCreated = (created) => {
    const newItems = Array.isArray(created) ? created : [created];
    setTasks((prev) => [...prev, ...newItems]);
  };

  const title = useMemo(() => {
    const d = new Date(date);
    if (view === "day")
      return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (view === "week") {
      const s = startOfWeek(d);
      const e = endOfWeek(d);
      return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
    }
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [view, date]);

  return (
    <div className="calendar-wrap">
      <div className="cal-toolbar">
        <div className="left">
          <button
            onClick={() =>
              setDate(view === "day" ? addDays(date, -1)
                : view === "week" ? addWeeks(date, -1)
                  : addMonths(date, -1))
            }
          >
            ←
          </button>
          {/* ✅ „Dziś” ustawia lokalną datę bez UTC przesunięcia */}
          <button onClick={() => setDate(fmt(new Date()))}>Dziś</button>
          <button
            onClick={() =>
              setDate(view === "day" ? addDays(date, 1)
                : view === "week" ? addWeeks(date, 1)
                  : addMonths(date, 1))
            }
          >
            →
          </button>
        </div>
        <div className="center">
          <h3>{title}</h3>
        </div>
        <div className="right">
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="day">Dzień</option>
            <option value="week">Tydzień</option>
            <option value="month">Miesiąc</option>
          </select>
          <button onClick={() => setPopoverDate(date)}>➕ Dodaj</button>
        </div>
      </div>

      {loading && <div className="hint">Wczytywanie…</div>}

      {view === "day" && (
        <DayView
          date={date}
          tasks={tasks}
          habits={habits}
          onSlotClick={(d) => setPopoverDate(d)}
        />
      )}

      {view === "week" && (
        <WeekView
          // ⬇️ przekazujemy poniedziałek tygodnia w lokalnym ISO
          weekStart={fmt(startOfWeek(new Date(date)))}
          tasks={tasks}
          habits={habits}
          onSlotClick={(d) => setPopoverDate(d)}
        />
      )}

      {view === "month" && (
        <MonthView
          initialDate={date}
          onAdd={(d) => setPopoverDate(d)}
          onClose={() => setView("week")}
        />
      )}

      {popoverDate && (
        <TaskPopover
          date={popoverDate}
          onClose={() => setPopoverDate(null)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}
