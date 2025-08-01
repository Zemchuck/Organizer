import React, { useEffect, useMemo, useState } from "react";
import "./MonthView.css";

/* ---------- pomocnicze ---------- */
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function MonthView({ date, enterDayView }) {
  /* 1. pierwszy / ostatni dzień miesiąca */
  const firstDay = useMemo(() => firstOfMonth(date), [date]);
  const lastDay  = useMemo(() => lastOfMonth(date),  [date]);

  /* 2. ile pustych komórek przed 1-szym (poniedziałek = 0) */
  const startOffset = (firstDay.getDay() + 6) % 7;

  /* 3. tablica dni (nr lub null) = 42 komórki (6×7) */
  const daysArray = useMemo(() => {
    const total = startOffset + lastDay.getDate();
    const rows  = Math.ceil(total / 7) * 7;      // 35 lub 42
    return Array.from({ length: rows }, (_, i) => {
      const day = i - startOffset + 1;
      return day > 0 && day <= lastDay.getDate() ? day : null;
    });
  }, [startOffset, lastDay]);

  /* ---------- pobranie zadań w miesiącu ---------- */
  const [taskCounts, setTaskCounts] = useState({});  // YYYY-MM-DD → liczba
  useEffect(() => {
    const startISO = firstDay.toISOString().slice(0, 10);
    const endISO   = lastDay.toISOString().slice(0, 10);

    (async () => {
      try {
        const res  = await fetch(
          `http://localhost:8000/tasks?start_date=${startISO}&end_date=${endISO}`
        );
        const data = await res.json();

        /* grupuj po dacie */
        const map = {};
        data.forEach((t) => {
          map[t.date] = (map[t.date] || 0) + 1;
        });
        setTaskCounts(map);
      } catch (e) {
        console.error(e);
        setTaskCounts({});
      }
    })();
  }, [firstDay, lastDay]);

  /* ---------- render ---------- */
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="month-grid">
      {/* nagłówki tygodnia ↓ */}
      {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => (
        <div key={"h" + d} className="month-head">
          {d}
        </div>
      ))}

      {/* komórki dni */}
      {daysArray.map((num, idx) => {
        const cellDate = num
          ? new Date(date.getFullYear(), date.getMonth(), num)
          : null;
        const iso = cellDate && cellDate.toISOString().slice(0, 10);
        const hasTasks = iso && taskCounts[iso] > 0;
        const isToday  = iso === todayISO;

        return (
          <div
            key={idx}
            className={
              "month-cell" +
              (num ? "" : " empty") +
              (isToday ? " today" : "")
            }
            onClick={() => iso && enterDayView && enterDayView(cellDate)}
          >
            {num}
            {hasTasks && <span className="task-dot" />}
          </div>
        );
      })}
    </div>
  );
}
