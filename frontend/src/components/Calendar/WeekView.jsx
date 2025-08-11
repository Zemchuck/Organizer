import React, { useEffect, useMemo, useRef, useState } from "react";
import "./WeekView.css";
import { toLocalISO, mondayOf } from "../../helpers/date.js";

const POPOVER_W = 300;
const pad2 = (n) => String(n).padStart(2, "0");

// ---- helpers czasu ----
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

  // POPoVER: „klejący się”
  const [open, setOpen] = useState(null); // { rect, event, anchor }
  const popRef = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      const pop = popRef.current;
      if (pop && pop.contains(e.target)) return;          // klik wewnątrz → zostaje
      if (open.anchor?.contains?.(e.target)) return;      // klik w kafelek → zostaje
      setOpen(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // lokalny stan „done” (optymistyczny toggle)
  const [doneMap, setDoneMap] = useState({});

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
        startMin, endMin, raw: t, dateKey: key,
      });
      if (typeof t.status === "boolean") doneMap[`task-${t.id}`] ??= !!t.status;
    }

    for (const day of days) {
      const key = toLocalISO(day);
      for (const h of habits) {
        if (!habitOccursOn(h, day)) continue;
        const startMin = timeToMinutes(h.time_of_day);
        const endMin = startMin + (h.duration || 25);
        map.get(key).push({
          id: `habit-${h.id}-${key}`,
          type: "habit",
          title: h.title || "Nawyk",
          description: h.description || "",
          color: h.color || "#6fead1",
          startMin, endMin, raw: h, dateKey: key,
        });
      }
    }

    const laid = {};
    for (const [k, arr] of map.entries()) laid[k] = layoutBlocks(arr);
    return laid;
  }, [days, tasks, habits]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date();
  const todayKey = toLocalISO(today);
  const nowPosPct = ((today.getHours() * 60 + today.getMinutes()) / (24 * 60)) * 100;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  function openPopover(e, ev) {
    const r = e.currentTarget.getBoundingClientRect();
    setOpen({ rect: r, event: ev, anchor: e.currentTarget });
  }

  async function toggleEventDone(ev) {
    const isDone = !!doneMap[ev.id];
    try {
      if (ev.type === "task") {
        await fetch(`/tasks/${ev.raw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: !isDone }),
        });
      } else {
        const url = `/habits/${ev.raw.id}/logs/${ev.dateKey}`;
        if (!isDone) {
          await fetch(`/habits/${ev.raw.id}/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done_on: ev.dateKey }),
          });
        } else {
          await fetch(url, { method: "DELETE" });
        }
      }
      setDoneMap((m) => ({ ...m, [ev.id]: !isDone }));
      // powiadom inne widoki (np. Cele i Nawyki) że dane się zmieniły
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: ev.type } }));
    } catch (e) {
      console.error(e);
    }
  }

  async function removeHabit(id, title) {
    if (!confirm(`Usunąć nawyk „${title}”?`)) return;
    try {
      await fetch(`/habits/${id}`, { method: "DELETE" });
      // UI – usuń wszystkie instancje tego nawyku z tygodnia
      // (tu prosto: filtr po .raw.id przy re-renderze z propsów)
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
      setOpen(null);
    } catch (e) { console.error(e); }
  }

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
        {/* lewa kolumna – tylko linie; etykiety dokładnie przy liniach */}
        <div className="hours-col" aria-hidden>
          {hours.map((h) => <div key={h} className="hour-row" />)}
          {/* overlay z etykietami „przy kresce” */}
          <div className="hour-labels">
            {hours.map((h) => (
              <div key={h} className="hour-label-el" style={{ top: `${(h / 24) * 100}%` }}>
                <span className="hour-label">{pad2(h)}:00</span>
              </div>
            ))}
          </div>
        </div>

        {days.map((d) => {
          const key = toLocalISO(d);
          const events = eventsByDay[key] || [];
          const isToday = key === todayKey;
          return (
            <div key={key} className="day-col" onDoubleClick={() => onSlotClick?.(key)}>
              {hours.map((h) => <div key={h} className="hour-row" aria-hidden />)}

              {/* „teraz” w bieżącym dniu */}
              {isToday && <div className="now-pin" style={{ top: `${nowPosPct}%` }} />}

              {events.map((ev) => {
                const top = (ev.startMin / (24 * 60)) * 100;
                const height = Math.max(((ev.endMin - ev.startMin) / (24 * 60)) * 100, 2.5);
                const gap = 2;
                const width = Math.max(100 / ev.colCount - gap, 10);
                const left = ev.col * (100 / ev.colCount) + gap / 2;

                const kind = ev.type === "habit" ? "habit" : "task";
                const dur = ev.endMin - ev.startMin;
                const sizeClass =
                  dur < 30 ? "tiny" : dur < 60 ? "small" : dur < 120 ? "normal" : "large";

                const isDone = !!doneMap[ev.id];

                return (
                  <div
                    key={ev.id}
                    className={`event-block ${kind} ${sizeClass} ${isDone ? "done" : ""}`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      "--ev-color": ev.color,
                    }}
                    onClick={(e) => openPopover(e, ev)}
                  >
                    <button
                      className={`ev-check ${isDone ? "checked" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleEventDone(ev); }}
                      title={isDone ? "Cofnij" : "Oznacz jako zrobione"}
                    />
                    <span className="ev-title" title={ev.title}>{ev.title}</span>
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

      {/* POPOVER (przy kafelku) */}
      {open && (
        <div
          ref={popRef}
          className={`event-pop ${open.event.type}`}
          style={{
            position: "fixed",
            top: open.rect.top + open.rect.height / 2 + window.scrollY,
            left: Math.min(
              window.scrollX + window.innerWidth - POPOVER_W - 8,
              open.rect.right + window.scrollX + 10
            ),
            width: POPOVER_W,
            transform: "translateY(-50%)",
          }}
        >
          {open.event.type === "habit" ? (
            /* POPoVER HABITU – 1:1 jak w „Cele i Nawyki”, ale akcje: Zalicz/Cofnij + Usuń */
            <div className="habit-popover" role="dialog">
              <div className="popover-head">
                <strong>{open.event.title}</strong>
                <span className="status">Nawyk</span>
              </div>
              <div className="popover-desc">{open.event.description || "Brak opisu"}</div>
              <div className="popover-meta">
                <span>Godzina: {minutesToHHMM(open.event.startMin)}</span>
                <span>Czas trwania: {open.event.endMin - open.event.startMin}m</span>
              </div>
              <div className="popover-actions">
                <button type="button" className="btn small" onClick={() => toggleEventDone(open.event)}>
                  {doneMap[open.event.id] ? "Cofnij dzisiaj" : "Zalicz dzisiaj"}
                </button>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => removeHabit(open.event.raw.id, open.event.title)}
                >
                  Usuń
                </button>
              </div>
            </div>
          ) : (
            /* POPoVER TASKA – prosty */
            <div className="task-popover-like" role="dialog">
              <div className="ep-title">{open.event.title}</div>
              {open.event.description && <div className="ep-desc">{open.event.description}</div>}
              <div className="ep-times">
                {minutesToHHMM(open.event.startMin)}–{minutesToHHMM(open.event.endMin)}
              </div>
              <div className="ep-actions">
                <button className="pop-btn" onClick={() => toggleEventDone(open.event)}>
                  {doneMap[open.event.id] ? "Cofnij wykonanie" : "Oznacz jako zrobione"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
