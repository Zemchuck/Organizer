import React, { useMemo } from "react";

export default function MonthTable({ year, month, onSelect }) {
  const { weeks, firstOfMonth, today } = useMemo(() => {
    const today = new Date();
    const firstOfMonth = new Date(year, month, 1);
    const firstDay = (firstOfMonth.getDay() + 6) % 7; // poniedziałek = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let dayCounter = 1 - firstDay;
    while (dayCounter <= daysInMonth) {
      weeks.push(
        Array.from({ length: 7 }, (_, idx) => {
          const day = dayCounter + idx;
          return day > 0 && day <= daysInMonth ? day : null;
        })
      );
      dayCounter += 7;
    }
    return { weeks, firstOfMonth, today };
  }, [year, month]);

  const isToday = (d) =>
    d && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="month-table">
      <div className="month-table__grid month-table__head-row">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => (
          <div key={d} className="month-table__head">
            {d}
          </div>
        ))}
      </div>

      <div className="month-table__grid">
        {weeks.flat().map((day, idx) => (
          <div
            key={idx}
            className={`month-table__cell ${!day ? "empty" : ""} ${isToday(day) ? "today" : ""}`}
            onClick={() => day && onSelect?.(new Date(year, month, day))}
          >
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}