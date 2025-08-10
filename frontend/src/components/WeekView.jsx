import React, { useEffect, useMemo, useState } from "react";
import "./WeekView.css";
import { toLocalISO, mondayOf } from "../helpers/date.js";

const POPOVER_W = 280;
const pad2 = (n) => String(n).padStart(2, "0");

function timeToMinutes(tstr) {
  const [hh = "00", mm = "00"] = String(tstr || "").split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}
function minutesToHHMM(totalMin) {
  const m = ((totalMin % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

/* układ kolumn dla nachodzących eventów */
function layoutBlocks(items) {
  const events = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const clusters = [];
  let cur = [], curEnd = -1;
  for (const ev of events) {
    if (!cur.length || ev.startMin < curEnd) { cur.push(ev); curEnd = Math.max(curEnd, ev.endMin); }
    else { clusters.push(cur); cur = [ev]; curEnd = ev.endMin; }
  }
  if (cur.length) clusters.push(cur);

  const out = [];
  for (const group of clusters) {
    const colsEnd = [];
    for (const ev of group) {
      let col = colsEnd.findIndex((end) => ev.startMin >= end);
      if (col === -1) { col = colsEnd.length; colsEnd.push(ev.endMin); }
      else { colsEnd[col] = ev.endMin; }
      out.push({ ...ev, col, colCount: colsEnd.length });
    }
    const maxCols = Math.max(...out.slice(-group.length).map((e) => e.col + 1));
    for (let i = out.length - group.length; i < out.length; i++) out[i].colCount = maxCols;
  }
  return out;
}

function habitOccursOn(h, day) {
  if (h?.active === false) return false;
  if (!h?.start_date || !h?.time_of_day) return false;
  const start = new Date(h.start_date + "T00:00:00");
  if (day < start) return false;
  if (h.repeat_until && day > new Date(h.repeat_until + "T23:59:59")) return false;
  const wd = (day.getDay() + 6) % 7; // 0 = pon
  const days = Array.isArray(h.repeat_days) ? h.repeat_days : [];
  return days.includes(wd);
}

export default function WeekView({ weekStart, tasks = [], habits = [], onSlotClick }) {
  const start = useMemo(() => mondayOf(weekStart || new Date()), [weekStart]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      arr.push(d);
    }
    return arr;
  }, [start]);

  const [hover, setHover] = useState(null);
  useEffect(() => {
    const close = () => setHover(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map(days.map(d => [toLocalISO(d), []]));

    for (const t of tasks) {
      if (!t?.time) continue;
      const dt = new Date(t.time);
      const key = toLocalISO(dt);
      if (!map.has(key)) continue;
      const startMin = dt.getHours() * 60 + dt.getMinutes();
      const endMin = startMin + (t.duration || 60);
      map.get(key).push({
        id: `task-${t.id}`,
        type: "task",
        title: t.title || "Zadanie",
        description: t.description || "",
        color: t.color || "#7aa7ff",
        startMin, endMin, raw: t,
      });
    }

    for (const day of days) {
      for (const h of habits) {
        if (!habitOccursOn(h, day)) continue;
        const key = toLocalISO(day);
        const startMin = timeToMinutes(h.time_of_day);
        const endMin = startMin + (h.duration || 25);
        map.get(key).push({
          id: `habit-${h.id}-${key}`,
          type: "habit",
          title: h.title || "Nawyk",
          description: h.description || "",
          color: h.color || "#6fead1",
          startMin, endMin, raw: h,
        });
      }
    }

    const laid = {};
    for (const [k, arr] of map.entries()) laid[k] = layoutBlocks(arr);
    return laid;
  }, [days, tasks, habits]);

  const today = new Date();
  const todayKey = toLocalISO(today);
  const nowPosPct = ((today.getHours() * 60 + today.getMinutes()) / (24 * 60)) * 100;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  function showPopover(e, ev) {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ rect: r, event: ev });
  }
  const hidePopover = () => setHover(null);

  return (
    <div className="week-view">
      {/* NAGŁÓWEK */}
      <div className="week-head">
        <div className="head-cell gutter" aria-hidden />
        {days.map((d) => {
          const key = toLocalISO(d);
          const isToday = key === todayKey;
          const wd = d.toLocaleDateString(undefined, { weekday: "short" });
          const dd = pad2(d.getDate());
          const mm = pad2(d.getMonth() + 1);
          return (
            <div key={key} className={`head-cell ${isToday ? "today" : ""}`}>
              <span className="wd">{wd}</span>
              <span className="dm">{dd}.{mm}</span>
            </div>
          );
        })}
      </div>

      {/* SIATKA */}
      <div className="week-grid">
        {/* lewa kolumna z godzinami */}
        <div className="hours-col" aria-hidden>
          {hours.map((h) => (
            <div key={h} className="hour-cell">{pad2(h)}:00</div>
          ))}
        </div>

        {days.map((d) => {
          const key = toLocalISO(d);
          const events = eventsByDay[key] || [];
          const isToday = key === todayKey;
          return (
            <div key={key} className="day-col" onDoubleClick={() => onSlotClick?.(key)}>
              {hours.map((h) => <div key={h} className="hour-row" aria-hidden />)}

              {/* czerwona kropka „teraz” w bieżącym dniu */}
              {isToday && (
                <div className="now-pin" style={{ top: `${nowPosPct}%` }} />
              )}

              {events.map((ev) => {
                const top = (ev.startMin / (24 * 60)) * 100;
                const height = Math.max(((ev.endMin - ev.startMin) / (24 * 60)) * 100, 2.5);
                const gap = 2;
                const width = Math.max(100 / ev.colCount - gap, 10);
                const left = ev.col * (100 / ev.colCount) + gap / 2;

                const kind = ev.type === "habit" ? "habit" : "task";
                const dur = ev.endMin - ev.startMin;
                const sizeClass =
                  dur < 30 ? "tiny" :
                    dur < 60 ? "small" :
                      dur < 120 ? "normal" : "large";

                return (
                  <div
                    key={ev.id}
                    className={`event-block ${kind} ${sizeClass}`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      "--ev-color": ev.color,
                    }}
                    onMouseEnter={(e) => showPopover(e, ev)}
                    onMouseLeave={hidePopover}
                  >
                    {/* zakres czasu */}
                    <span className="ev-time">
                      {minutesToHHMM(ev.startMin)}–{minutesToHHMM(ev.endMin)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* czerwona linia „teraz” – przez całą siatkę */}
        {days.some(d => toLocalISO(d) === todayKey) && (
          <div className="now-line" style={{ top: `${nowPosPct}%` }} />
        )}
      </div>

      {/* POPOVER */}
      {hover && (
        <div
          className="event-popover right"
          style={{
            position: "fixed",
            top: hover.rect.top + hover.rect.height / 2 + window.scrollY,
            left: Math.min(
              window.scrollX + window.innerWidth - POPOVER_W - 8,
              hover.rect.right + window.scrollX + 10
            ),
            width: POPOVER_W,
            transform: "translateY(-50%)",
          }}
          onMouseLeave={hidePopover}
        >
          <div className="ep-title">{hover.event.title}</div>
          {hover.event.description && <div className="ep-desc">{hover.event.description}</div>}
          <div className="ep-actions">
            {hover.event.type === "task" ? (
              <>
                <button className="pop-btn">Otwórz/Ukończ</button>
                <button className="pop-btn danger">Usuń</button>
              </>
            ) : (
              <>
                <button className="pop-btn">Aktywuj/Wstrzymaj</button>
                <button className="pop-btn danger">Usuń</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
