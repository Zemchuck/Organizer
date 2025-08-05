// src/components/Calendar.jsx
import React, { useEffect, useState } from "react";
import MonthView from "./MonthView";
import WeekView  from "./WeekView";
import DayView   from "./DayView";
import TaskForm  from "./TaskForm";
import { mondayOf } from "../helpers/date";

const VIEWS = { DAY: "day", WEEK: "week", MONTH: "month" };

export default function Calendar() {
  /* ---------- STANY ---------- */
  const [view, setView] = useState(() =>
    localStorage.getItem("preferredView") || VIEWS.MONTH
  );
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return view === VIEWS.WEEK ? mondayOf(d) : d;
  });
  const [showForm, setShowForm] = useState(false);

  /* ---------- ZAPAMIĘTUJEMY WIDOK ---------- */
  useEffect(() => {
    localStorage.setItem("preferredView", view);
  }, [view]);

  /* ---------- NAWIGACJA ---------- */
  const goPrev = () => {
    const d = new Date(currentDate);
    if (view === VIEWS.DAY)       d.setDate(d.getDate() - 1);
    else if (view === VIEWS.WEEK) d.setDate(d.getDate() - 7);
    else                          d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (view === VIEWS.DAY)       d.setDate(d.getDate() + 1);
    else if (view === VIEWS.WEEK) d.setDate(d.getDate() + 7);
    else                          d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  /* ---------- RENDER WIDOK ---------- */
  const renderView = () => {
    switch (view) {
      case VIEWS.DAY:
        return <DayView date={currentDate} />;
      case VIEWS.WEEK:
        return (
          <WeekView
            date={currentDate}
            enterDayView={(d) => {
              setCurrentDate(d);
              setView(VIEWS.DAY);
            }}
          />
        );
      default:
        return (
          <MonthView
            date={currentDate}
            enterDayView={(d) => {
              setCurrentDate(d);
              setView(VIEWS.DAY);
            }}
          />
        );
    }
  };

  /* ---------- JSX ---------- */
  return (
    <div className="calendar">
      <header className="calendar__header">
        <div className="calendar__nav">
          <button onClick={goPrev}>«</button>
          <span className="calendar__title">
            {currentDate.toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
              ...(view === VIEWS.DAY && { day: "numeric" }),
            })}
          </span>
          <button onClick={goNext}>»</button>
        </div>

        <div className="calendar__view-switch">
          <button
            onClick={() => setView(VIEWS.DAY)}
            className={view === VIEWS.DAY ? "active" : ""}
          >
            Dzień
          </button>

          <button
            onClick={() => {
              setCurrentDate(mondayOf(currentDate));
              setView(VIEWS.WEEK);
            }}
            className={view === VIEWS.WEEK ? "active" : ""}
          >
            Tydzień
          </button>

          <button
            onClick={() => setView(VIEWS.MONTH)}
            className={view === VIEWS.MONTH ? "active" : ""}
          >
            Miesiąc
          </button>
        </div>
      </header>

      {/* ---------- PRZYCISK + DODAJ ---------- */}
      <button
        className="task-add-btn"
        onClick={() => setShowForm((v) => !v)}
        style={{ marginBottom: "1rem" }}
      >
        {showForm ? "✕ Zamknij" : "+ Dodaj zadanie"}
      </button>

      {/* ---------- WIDOK ---------- */}
      {renderView()}

      {/* ---------- FORMULARZ ---------- */}
      {showForm && (
        <TaskForm
          defaultDate={currentDate}
          onAdded={() => setCurrentDate((d) => new Date(d))}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}