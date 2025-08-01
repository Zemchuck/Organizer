import React from "react";

export default function DayView({ date }) {
  return (
    <div className="day-view">
      <h2>
        {date.toLocaleDateString("pl-PL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </h2>
      <p>Brak zadań na ten dzień (na razie).</p>
    </div>
  );
}
