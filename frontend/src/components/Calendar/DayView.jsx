import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./DayView.css";
import { toLocalISO } from "../../helpers/date.js";

const API = import.meta.env.VITE_API_URL || "/api";
const pad2 = (n) => String(n).padStart(2, "0");
const POPOVER_W = 300;

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

/* układ kolumn przy nakładaniu się eventów */
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

export default function DayView({ date, tasks = [], habits = [], onSlotClick }) {
  const dayKey = date || toLocalISO(new Date());

  // px/min z CSS var(--hour-h)
  const colRef = useRef(null);
  const [pxPerMin, setPxPerMin] = useState(0.5);
  useLayoutEffect(() => {
    const el = colRef.current; if (!el) return;
    const hourH = parseFloat(getComputedStyle(el).getPropertyValue("--hour-h")) || 30;
    setPxPerMin(hourH / 60);
  }, []);

  // lokalny stan „done" (optymistyczny toggle)
  const [doneMap, setDoneMap] = useState({});

  // eventy danego dnia (lokalnie)
  const events = useMemo(() => {
    const list = [];

    // zadania
    for (const t of tasks) {
      if (!t?.time) continue;
      const dt = new Date(t.time);
      if (toLocalISO(dt) !== dayKey) continue;

      const startMin = dt.getHours() * 60 + dt.getMinutes();
      const endMin = startMin + (t.duration || 60);

      list.push({
        id: `task-${t.id}`,
        type: "task",
        title: t.title || "Zadanie",
        description: t.description || "",
        color: t.color || "#7aa7ff",
        startMin, endMin, raw: t,
        rangeStr: `${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`,
        meta: [`${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`, `${t.duration || 60}m`],
      });
      if (typeof t.status === "boolean") doneMap[`task-${t.id}`] ??= !!t.status;
    }

    // nawyki
    for (const h of habits) {
      if (h?.active === false || !h?.start_date || !h?.time_of_day) continue;
      const day = new Date(dayKey + "T00:00:00");
      const start = new Date(h.start_date + "T00:00:00");
      if (day < start) continue;
      if (h.repeat_until && day > new Date(h.repeat_until + "T23:59:59")) continue;
      const wd = (day.getDay() + 6) % 7; // 0=Pn
      const days = Array.isArray(h.repeat_days) ? h.repeat_days : [];
      if (!days.includes(wd)) continue;

      const startMin = timeToMinutes(h.time_of_day);
      const endMin = startMin + (h.duration || 25);

      list.push({
        id: `habit-${h.id}-${dayKey}`,
        type: "habit",
        title: h.title || "Nawyk",
        description: h.description || "",
        color: h.color || "#6fead1",
        startMin, endMin, raw: h, dateKey: dayKey,
        rangeStr: `${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`,
        meta: [`${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`, `${h.duration || 25}m`],
      });
    }

    return layoutBlocks(list);
  }, [tasks, habits, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hours = Array.from({ length: 24 }, (_, i) => i);

  /* ===== Popover ===== */
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

  function openPopover(e, ev) {
    const r = e.currentTarget.getBoundingClientRect();
    setOpen({ rect: r, event: ev, anchor: e.currentTarget });
  }

  async function toggleEventDone(ev) {
    const isDone = !!doneMap[ev.id];
    try {
      if (ev.type === "task") {
        await fetch(`${API}/tasks/${ev.raw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: !isDone }),
        });
      } else {
        const url = `${API}/habits/${ev.raw.id}/logs/${ev.dateKey}`;
        if (!isDone) {
          await fetch(`${API}/habits/${ev.raw.id}/logs`, {
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
    if (!confirm(`Usunąć nawyk „${title}"?`)) return;
    try {
      await fetch(`${API}/habits/${id}`, { method: "DELETE" });
      // UI – usuń wszystkie instancje tego nawyku z tygodnia
      // (tu prosto: filtr po .raw.id przy re-renderze z propsów)
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
      setOpen(null);
    } catch (e) { console.error(e); }
  }

  return (
    <div className="day-view">
      <div className="day-head">
        {new Date(dayKey).toLocaleDateString(undefined, {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })}
      </div>

      <div className="day-grid">
        {/* lewa skala godzin */}
        <div className="hours-col" aria-hidden>
          {hours.map((h) => (
            <div key={h} className="hour-cell">
              <span className="hour-label">{`${pad2(h)}:00`}</span>
            </div>
          ))}
        </div>

        {/* kolumna dnia */}
        <div
          ref={colRef}
          className="day-col"
          onDoubleClick={() => onSlotClick?.(dayKey)}
        >
          {hours.map((h) => <div key={h} className="hour-cell" aria-hidden />)}

          {events.map((ev) => {
            const blockTopPx = Math.max(0, Math.round(pxPerMin * ev.startMin));
            const blockHeightPx = Math.max(12, Math.round(pxPerMin * (ev.endMin - ev.startMin)));
            const gap = 2;
            const blockWidthPct = Math.max(100 / ev.colCount - gap, 10);
            const blockLeftPct = ev.col * (100 / ev.colCount) + gap / 2;

            const kind = ev.type === "habit" ? "habit" : "task"; // normalize
            const dur = ev.endMin - ev.startMin;
            const sizeClass =
              dur < 30 ? "tiny" : dur < 60 ? "small" : dur < 120 ? "normal" : "large";

            const isDone = !!doneMap[ev.id];

            return (
              <div
                key={ev.id}
                className={`event-block ${kind} ${sizeClass} ${isDone ? "done" : ""}`}
                data-kind={kind}
                style={{
                  top: `${blockTopPx}px`,
                  height: `${blockHeightPx}px`,
                  left: `${blockLeftPct}%`,
                  width: `${blockWidthPct}%`,
                  "--ev-color": ev.color, // gradient + kolor pod spodem
                }}
                onClick={(e) => openPopover(e, ev)}
                /* === A11y: klik/klawiatura jak przycisk === */
                role="button"
                tabIndex={0}
                aria-label={`Zdarzenie: ${ev.title}. Od ${minutesToHHMM(ev.startMin)} do ${minutesToHHMM(ev.endMin)}.`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPopover({ currentTarget: e.currentTarget }, ev);
                  }
                }}
              >
                <button
                  className={`ev-check ${isDone ? "checked" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleEventDone(ev); }}
                  title={isDone ? "Cofnij" : "Oznacz jako zrobione"}
                  aria-pressed={isDone}
                  aria-label={isDone ? "Cofnij oznaczenie jako zrobione" : "Oznacz jako zrobione"}
                />
                <span className="ev-title" title={ev.title}>{ev.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* POPOVER (przy kafelku) */}
      {open && (
        <div
          ref={popRef}
          className={`event-pop ${open.event.type}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={open.event.type === "habit" ? "habit-popover-title" : "task-popover-title"}
          aria-describedby={open.event.type === "habit" ? "habit-popover-desc" : "task-popover-desc"}
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
            /* POPoVER HABITU – 1:1 jak w „Cele i Nawyki", ale akcje: Zalicz/Cofnij + Usuń */
            <div className="habit-popover" role="document">
              <div className="popover-head">
                <strong id="habit-popover-title">{open.event.title}</strong>
                <span className="status">Nawyk</span>
              </div>
              <div id="habit-popover-desc" className="popover-desc">{open.event.description || "Brak opisu"}</div>
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
            <div className="task-popover-like" role="document">
              <div id="task-popover-title" className="ep-title">{open.event.title}</div>
              {open.event.description && <div id="task-popover-desc" className="ep-desc">{open.event.description}</div>}
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
