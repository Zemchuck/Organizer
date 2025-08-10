import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

const fmt = (d) => d.toISOString().slice(0, 10);
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function MonthTable({ monthAnchor }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const anchor = monthAnchor ? new Date(monthAnchor) : new Date();

  const range = useMemo(() => {
    const s = firstOfMonth(anchor), e = lastOfMonth(anchor);
    return { start: fmt(s), end: fmt(e) };
  }, [anchor]);

  useEffect(() => {
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

  const rows = useMemo(() => {
    const m = {};
    for (const t of tasks) {
      if (!t.time) continue;
      const k = t.time.slice(0, 10);
      (m[k] ||= []).push(t);
    }
    const orderedDays = Object.keys(m).sort();
    return orderedDays.map((d) => ({
      date: d,
      items: m[d].sort((a, b) => new Date(a.time) - new Date(b.time)),
    }));
  }, [tasks]);

  return (
    <div className="month-table">
      {loading && <div className="hint">Wczytywanie…</div>}
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Zadania</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <td className="col-date">{new Date(r.date).toLocaleDateString()}</td>
              <td className="col-items">
                {r.items.map((t) => (
                  <div key={t.id} className="row-item" title={t.description || ""}>
                    <span className="dot" style={{ background: t.color || "#ccc" }} />
                    <span className="time">{new Date(t.time).toISOString().slice(11, 16)}</span>
                    <span className="title">{t.title}</span>
                  </div>
                ))}
              </td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={2} style={{ opacity: .75, textAlign: "center" }}>Brak zdarzeń w tym miesiącu</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
