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

  // stan wymuszający odświeżanie danych
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Inicjalizacja doneMap na podstawie statusu tasków
  useEffect(() => {
    const newDoneMap = {};
    for (const t of tasks) {
      if (typeof t.status === "boolean") {
        newDoneMap[`task-${t.id}`] = !!t.status;
      }
    }
    setDoneMap(prev => ({ ...prev, ...newDoneMap }));
  }, [tasks, refreshTrigger]);

  // Inicjalizacja doneMap dla nawyków na podstawie logów
  useEffect(() => {
    const loadHabitLogs = async () => {
      try {
        const response = await fetch(`${API}/habits/logs?start=${dayKey}&end=${dayKey}`, {
          headers: { Accept: "application/json" },
        });
        
        if (!response.ok) {
          console.error("Błąd podczas pobierania logów nawyków:", response.status);
          return;
        }
        
        const byHabit = await response.json(); // { [habit_id]: ["YYYY-MM-DD", ...] }
        const newDoneMap = {};
        
        for (const h of habits) {
          const dates = byHabit[h.id] || [];
          if (dates.includes(dayKey)) {
            newDoneMap[`habit-${h.id}-${dayKey}`] = true;
          }
        }
        
        setDoneMap(prev => ({ ...prev, ...newDoneMap }));
      } catch (e) {
        console.error("Błąd podczas pobierania logów nawyków:", e);
      }
    };
    
    if (habits.length > 0) {
      loadHabitLogs();
    }
  }, [habits, dayKey, refreshTrigger]);

  // cele do wyświetlania nazw w popoverach nawyków
  const [goals, setGoals] = useState([]);

  // pobierz cele
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API}/goals`);
        const data = await response.json();
        setGoals(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Nie udało się pobrać celów:", e);
        setGoals([]);
      }
    })();
  }, [refreshTrigger]);

  // Nasłuchuj na zmiany danych z innych komponentów
  useEffect(() => {
    const handleDataChanged = (event) => {
      const { kind } = event.detail;
      if (kind === 'habit' || kind === 'task') {
        // Odśwież dane - zresetuj doneMap i wymuś ponowne załadowanie
        setDoneMap({});
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('data:changed', handleDataChanged);
    return () => {
      window.removeEventListener('data:changed', handleDataChanged);
    };
  }, []);

  // helper do pobierania nazwy celu
  const getGoalTitle = (goalId) => {
    if (!goalId) return "—";
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.title : `#${goalId}`;
  };

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
  }, [tasks, habits, dayKey, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const response = await fetch(`${API}/tasks/${ev.raw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: !isDone }),
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            alert(`Zadanie "${ev.title}" nie istnieje lub zostało usunięte.`);
            window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "task" } }));
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } else {
        const url = `${API}/habits/${ev.raw.id}/logs/${ev.dateKey}`;
        let response;
        
        if (!isDone) {
          response = await fetch(`${API}/habits/${ev.raw.id}/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done_on: ev.dateKey }),
          });
        } else {
          response = await fetch(url, { method: "DELETE" });
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            alert(`Nawyk "${ev.title}" nie istnieje lub został usunięty.`);
            window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      setDoneMap((m) => ({ ...m, [ev.id]: !isDone }));
      // powiadom inne widoki (np. Cele i Nawyki) że dane się zmieniły
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: ev.type } }));
    } catch (e) {
      console.error("Błąd podczas zmiany statusu:", e);
      alert(`Nie udało się zmienić statusu: ${e.message}`);
    }
  }

  async function removeHabit(id, title) {
    if (!confirm(`Usunąć nawyk „${title}"?`)) return;
    try {
      const response = await fetch(`${API}/habits/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        if (response.status === 404) {
          alert(`Nawyk "${title}" nie istnieje lub został już usunięty.`);
          window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
          setOpen(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // UI – usuń wszystkie instancje tego nawyku z tygodnia
      // (tu prosto: filtr po .raw.id przy re-renderze z propsów)
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
      setOpen(null);
    } catch (e) { 
      console.error("Błąd podczas usuwania nawyku:", e);
      alert(`Nie udało się usunąć nawyku: ${e.message}`);
    }
  }

  async function removeTask(id, title) {
    if (!confirm(`Usunąć zadanie „${title}"?`)) return;
    try {
      const response = await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        if (response.status === 404) {
          alert(`Zadanie "${title}" nie istnieje lub zostało już usunięte.`);
          window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "task" } }));
          setOpen(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // aktualizacja UI
      setDoneMap(m => {
        const c = { ...m };
        delete c[`task-${id}`];
        return c;
      });
      // powiadom inne widoki o zmianie danych
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "task" } }));
      setOpen(null);
    } catch (e) {
      console.error("Błąd podczas usuwania zadania:", e);
      alert(`Nie udało się usunąć zadania: ${e.message}`);
    }
  }

  async function editTask(task) {
    // TODO: Implementuj pełną edycję zadania
    // Na razie otwórz alert z podstawowymi informacjami
    const newTitle = prompt("Edytuj nazwę zadania:", task.title);
    if (newTitle === null || newTitle.trim() === "") return;
    
    try {
      const response = await fetch(`${API}/tasks/${task.raw.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          alert(`Zadanie "${task.title}" nie istnieje lub zostało usunięte.`);
          window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "task" } }));
          setOpen(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // powiadom inne widoki o zmianie danych
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "task" } }));
      setOpen(null);
    } catch (e) {
      console.error("Błąd podczas edycji zadania:", e);
      alert(`Nie udało się zaktualizować zadania: ${e.message}`);
    }
  }

  async function editHabit(habit) {
    // TODO: Implementuj pełną edycję nawyku
    // Na razie otwórz alert z podstawowymi informacjami
    const newTitle = prompt("Edytuj nazwę nawyku:", habit.title);
    if (newTitle === null || newTitle.trim() === "") return;
    
    try {
      const response = await fetch(`${API}/habits/${habit.raw.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          alert(`Nawyk "${habit.title}" nie istnieje lub został usunięty.`);
          window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
          setOpen(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // powiadom inne widoki o zmianie danych
      window.dispatchEvent(new CustomEvent("data:changed", { detail: { kind: "habit" } }));
      setOpen(null);
    } catch (e) {
      console.error("Błąd podczas edycji nawyku:", e);
      alert(`Nie udało się zaktualizować nawyku: ${e.message}`);
    }
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
            top: open.rect.top + open.rect.height / 2,
            left: Math.min(
              window.innerWidth - POPOVER_W - 8,
              open.rect.right + 10
            ),
            width: POPOVER_W,
            transform: "translateY(-50%)",
          }}
        >
          {open.event.type === "habit" ? (
            /* POPoVER HABITU – skopiowany 1:1 z taska */
            <div 
              className="task-popover-like" 
              style={{ "--ev-color": open.event.color }}
              role="document"
            >
              <div className="popover-head">
                <strong id="habit-popover-title">{open.event.title}</strong>
                <span className="status">
                  {doneMap[open.event.id] ? "Zrobione" : "Do zrobienia"}
                </span>
              </div>

              {open.event.description && (
                <div id="habit-popover-desc" className="popover-desc">
                  {open.event.description}
                </div>
              )}

              <div className="popover-meta">
                <span>Godzina: {minutesToHHMM(open.event.startMin)}</span>
                <span>Czas trwania: {open.event.endMin - open.event.startMin}m</span>
                <span>Cel: {getGoalTitle(open.event.raw?.goal_id)}</span>
              </div>

              <div className="popover-actions">
                <button className="pop-btn primary" onClick={() => toggleEventDone(open.event)}>
                  {doneMap[open.event.id] ? "Cofnij" : "Oznacz jako zrobione"}
                </button>
              </div>
            </div>
          ) : (
            /* POPoVER TASKA – ujednolicony z popoverem nawyku */
            <div 
              className="task-popover-like" 
              style={{ "--ev-color": open.event.color }}
              role="document"
            >
              <div className="popover-head">
                <strong id="task-popover-title">{open.event.title}</strong>
                <span className="status">
                  {doneMap[open.event.id] ? "Zrobione" : "Do zrobienia"}
                </span>
              </div>

              {open.event.description && (
                <div id="task-popover-desc" className="popover-desc">
                  {open.event.description}
                </div>
              )}

              <div className="popover-meta">
                <span>Godzina: {minutesToHHMM(open.event.startMin)}</span>
                <span>Czas trwania: {open.event.endMin - open.event.startMin}m</span>
              </div>

              <div className="popover-actions">
                <button className="pop-btn primary" onClick={() => toggleEventDone(open.event)}>
                  {doneMap[open.event.id] ? "Cofnij" : "Oznacz jako zrobione"}
                </button>
                <button className="pop-btn" onClick={() => editTask(open.event)}>
                  Edytuj
                </button>
                <button className="pop-btn danger" onClick={() => removeTask(open.event.raw.id, open.event.title)}>
                  Usuń zadanie
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
