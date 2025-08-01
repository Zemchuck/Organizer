import React from "react";

function startOfWeek(date) {
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  return monday;
}

export default function WeekView({ date }) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

  return (
    <div className="week-grid">
      {days.map((d) => (
        <div key={d.toDateString()} className="week-cell">
          {d.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric" })}
        </div>
      ))}
    </div>
  );
}