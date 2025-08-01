// src/components/Calendar.jsx
import React, { useEffect, useState } from "react";
import DayView   from "./DayView";
import WeekView  from "./WeekView";
import MonthView from "./MonthView";
import TaskForm  from "./TaskForm";

const VIEWS = { DAY: "day", WEEK: "week", MONTH: "month" };

export default function Calendar() {
  /* ---------- STANY ---------- */
  const [view, setView] = useState(
    () => localStorage.getItem("preferredView") || VIEWS.MONTH
  );
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return view === VIEWS.WEEK ? getMonday(d) : d;
  });

  /* formularz „+ Dodaj” */
  const [showForm, setShowForm] = useState(false);

  /* ---------- PERSIST VIEW ---------- */
  useEffect(() => {
    localStorage.setItem("preferredView", view);
  }, [view]);

  /* ---------- HELPERS ---------- */
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7; // 0→7
    if (day !== 1) d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

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

      case VIEWS.MONTH:
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
      {/* ---------- NAGŁÓWEK ---------- */}
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

        {/* ---------- PRZEŁĄCZNIK WIDOKÓW ---------- */}
        <div className="calendar__view-switch">
          <button
            onClick={() => setView(VIEWS.DAY)}
            className={view === VIEWS.DAY ? "active" : ""}
          >
            Dzień
          </button>

          <button
            onClick={() => {
              setCurrentDate(getMonday(currentDate));
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

      {/* ---------- WIDOK (DAY/WEEK/MONTH) ---------- */}
      {renderView()}

      {/* ---------- FORMULARZ ---------- */}
      {showForm && (
        <TaskForm
          defaultDate={currentDate}
          onAdded={() => {
            /* po dodaniu odświeżamy widok – tworzymy nowy obiekt Date,
               żeby useEffect w widokach odczytał zmianę */
            setCurrentDate((d) => new Date(d));
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
