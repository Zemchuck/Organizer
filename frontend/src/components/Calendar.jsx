import React, { useState, useEffect } from "react";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import TaskForm from "./TaskForm";

const VIEWS = { DAY: "day", WEEK: "week", MONTH: "month" };

export default function Calendar() {
  const [view, setView] = useState(() => localStorage.getItem("preferredView") || VIEWS.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    localStorage.setItem("preferredView", view);
  }, [view]);

  const goPrev = () => {
    const date = new Date(currentDate);
    if (view === VIEWS.DAY) date.setDate(date.getDate() - 1);
    else if (view === VIEWS.WEEK) date.setDate(date.getDate() - 7);
    else date.setMonth(date.getMonth() - 1);
    setCurrentDate(date);
  };

  const goNext = () => {
    const date = new Date(currentDate);
    if (view === VIEWS.DAY) date.setDate(date.getDate() + 1);
    else if (view === VIEWS.WEEK) date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1);
    setCurrentDate(date);
  };

  const renderView = () => {
    switch (view) {
      case VIEWS.DAY:
        return <DayView date={currentDate} />;
      case VIEWS.WEEK:
        return <WeekView date={currentDate} />;
      default:
        return <MonthView date={currentDate} />;
    }
  };

  return (
    <div className="calendar">
      <header className="calendar__header">
        <div className="calendar__nav">
          <button onClick={goPrev}>{"<"}</button>
          <span className="calendar__title">
            {currentDate.toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
              day: view === VIEWS.DAY ? "numeric" : undefined,
            })}
          </span>
          <button onClick={goNext}>{">"}</button>
        </div>
        <div className="calendar__view-switch">
          <button className={view === VIEWS.DAY ? "active" : ""} onClick={() => setView(VIEWS.DAY)}>
            Dzień
          </button>
          <button className={view === VIEWS.WEEK ? "active" : ""} onClick={() => setView(VIEWS.WEEK)}>
            Tydzień
          </button>
          <button className={view === VIEWS.MONTH ? "active" : ""} onClick={() => setView(VIEWS.MONTH)}>
            Miesiąc
          </button>
        </div>
      </header>
      {renderView()}
      <TaskForm />
    </div>
  );
}