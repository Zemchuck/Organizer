import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./DayView.css";
import { toLocalISO } from "../../helpers/date.js";

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
        color: t.color || "#c84a5b",
        startMin, endMin,
        rangeStr: `${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`,
        meta: [`${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`, `${t.duration || 60}m`],
      });
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
        startMin, endMin,
        rangeStr: `${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`,
        meta: [`${minutesToHHMM(startMin)}–${minutesToHHMM(endMin)}`, `${h.duration || 25}m`],
      });
    }

    return layoutBlocks(list);
  }, [tasks, habits, dayKey]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  /* ===== Popover (z histerezą) ===== */
  const [hover, setHover] = useState(null); // { rect, event }
  const hideTimer = useRef(null);

  useEffect(() => {
    const close = () => setHover(null);
    const onKey = (e) => { if (e.key === "Escape") setHover(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openPopover = (e, ev) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ rect, event: ev });
  };
  const armHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHover(null), 120);
  };
  const cancelHide = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  };

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
          {hours.map((h) => <div key={h} className="hour-cell">{pad2(h)}:00</div>)}
        </div>

        {/* kolumna dnia */}
        <div
          ref={colRef}
          className="day-col"
          onDoubleClick={() => onSlotClick?.(dayKey)}
        >
          {hours.map((h) => <div key={h} className="hour-row" aria-hidden />)}

          {events.map((ev) => {
            const blockTopPx = Math.max(0, Math.round(pxPerMin * ev.startMin));
            const blockHeightPx = Math.max(12, Math.round(pxPerMin * (ev.endMin - ev.startMin)));
            const gap = 2;
            const blockWidthPct = Math.max(100 / ev.colCount - gap, 10);
            const blockLeftPct = ev.col * (100 / ev.colCount) + gap / 2;

            const kind = ev.type === "habit" ? "habit" : "task"; // normalize

            return (
              <div
                key={ev.id}
                className={`event-block ${kind}`}
                data-kind={kind}
                style={{
                  top: `${blockTopPx}px`,
                  height: `${blockHeightPx}px`,
                  left: `${blockLeftPct}%`,
                  width: `${blockWidthPct}%`,
                  "--ev-color": ev.color, // gradient + kolor pod spodem
                }}
                onMouseEnter={(e) => openPopover(e, ev)}
                onMouseLeave={armHide}

                /* === A11y: klik/klawiatura jak przycisk === */
                onClick={(e) => openPopover(e, ev)}
                role="button"
                tabIndex={0}
                aria-label={`Zdarzenie: ${ev.title}. ${ev.rangeStr}.`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPopover({ currentTarget: e.currentTarget }, ev);
                  }
                }}
              >
                <span className="ev-time">{ev.rangeStr}</span>
                <span className="ev-title">{ev.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popover po prawej */}
      {hover && (
        <div
          className="event-popover right"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-popover-title"
          aria-describedby="day-popover-desc"
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
          onMouseEnter={cancelHide}
          onMouseLeave={armHide}
        >
          <div id="day-popover-title" className="ep-title">{hover.event.title}</div>
          {hover.event.description && <div id="day-popover-desc" className="ep-desc">{hover.event.description}</div>}
          <div
            className="popover-meta"
            style={{
              opacity: .85,
              fontSize: '.9rem',
              marginBottom: '.5rem',
              display: 'flex',
              gap: '.6rem',
              flexWrap: 'wrap'
            }}
          >
            {hover.event.meta?.map((m, i) => <span key={i}>{m}</span>)}
          </div>
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
