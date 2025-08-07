import React, { useEffect, useState } from "react";
import { toLocalISO } from "../helpers/date";

export default function StatsHabits() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/tasks/all")
      .then((r) => r.json())
      .then((arr) => {
        const today = toLocalISO(new Date());
        const habits = arr.filter(
          (t) => t.task_type === "habit" && toLocalISO(new Date(t.time)) <= today
        );
        const grouped = {};
        habits.forEach((t) => {
          grouped[t.title] = grouped[t.title] || { d: 0, t: 0 };
          grouped[t.title].t++;
          if (t.status) grouped[t.title].d++;
        });
        setData(Object.entries(grouped));
      });
  }, []);

  if (!data.length) return null;
  return (
    <div className="stats-container">
      <h2>Nawyki – Postępy</h2>
      {data.map(([title, { d, t }]) => {
        const pct = Math.round((d / t) * 100);
        return (
          <div key={title} style={{ marginBottom: "12px" }}>
            <span>{title}</span>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${pct}%` }}>
                {pct}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}