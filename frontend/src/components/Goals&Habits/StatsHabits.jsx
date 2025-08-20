// frontend/src/components/Goals&Habits/StatsHabits.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./StatsHabits.css";
import CreateGoalForm from "./CreateGoalForm.jsx";
import HabitForm from "./HabitForm.jsx";

// Ustaw przez .env: VITE_API_URL=http://127.0.0.1:8000
// lub użyj proxy w vite.config.js; bez env domyślnie trafia na ten sam host/port.
const API = import.meta.env.VITE_API_URL || "/api";

/* === Kolor chipów zgodny z kalendarzem (pole Habit.color) === */
function hexToRgb(hex) {
  if (!hex) return null;
  const m = String(hex).trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function chipStyle(habit) {
  const rgb = hexToRgb(habit?.color || "#7a7a7a"); // fallback
  if (!rgb) return {};
  return {
    // bazowy rozmiar treści chipa skaluje się z viewportem
    fontSize: "clamp(.92rem, .86rem + .25vw, 1.05rem)",
    background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`,
    borderColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`,
    boxShadow: `inset 0 0 0 1px rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
  };
}

/* === Helpers fetch === */
async function getJSON(url) {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`);
  if (!ct.includes("application/json")) {
    console.error("Non-JSON response", { url: res.url, status: res.status, ct, preview: text.slice(0, 200) });
    throw new Error(`Expected JSON, got: ${ct}`);
  }
  return JSON.parse(text || "null");
}
async function del(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

/* === Mały popover do habitów, pokazywany po najechaniu === */
function HabitPopover({ habit, progress }) {
  const pr = progress || { week_done: 0, week_target: 0, streak: 0 };
  const rgb = hexToRgb(habit?.color || "#7a7a7a") || { r: 122, g: 122, b: 122 };
  const chipBg = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
  const chipBorder = `rgba(${rgb.r},${rgb.g},${rgb.b},0.45)`;

  const style = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    zIndex: 30,
    minWidth: 240,
    maxWidth: 360,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${chipBorder}`,
    background: "rgba(20,20,22,.96)",
    boxShadow: "0 8px 30px rgba(0,0,0,.35)",
    color: "inherit",
    pointerEvents: "none",     // żeby hover nie „uciekał”
    backdropFilter: "blur(4px)"
  };

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    background: chipBg,
    border: `1px solid ${chipBorder}`,
    fontSize: "clamp(.78rem, .72rem + .3vw, .95rem)"
  };

  return (
    <div className="habit-popover" style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span className="dot" style={{ background: habit?.color || "#CCC" }} />
        <strong style={{ fontSize: "clamp(.95rem, .9rem + .3vw, 1.08rem)", lineHeight: 1.2 }}>
          {habit?.title}
        </strong>
      </div>
      {habit?.description && (
        <p style={{ margin: "6px 0 10px", opacity: .9, fontSize: "clamp(.84rem, .8rem + .25vw, .98rem)" }}>
          {habit.description}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={badgeStyle} title="Postęp w tym tygodniu">
          🔥 Seria: {pr.week_done}/{pr.week_target}
        </span>
        <span style={badgeStyle} title="Ciąg kolejnych dni">
          📆 Ciąg: {pr.streak} d
        </span>
        <span style={badgeStyle} title="Kolor nawyku">
          🎨 {habit?.color || "#—"}
        </span>
      </div>
    </div>
  );
}

export default function StatsHabits() {
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [progress, setProgress] = useState({}); // habit_id -> {week_done, week_target, streak}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // UI
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showDeleteGoalForm, setShowDeleteGoalForm] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  const [openFormFor, setOpenFormFor] = useState(null);          // goalId -> show HabitForm
  const [openDeleteForGoal, setOpenDeleteForGoal] = useState(null);
  const [habitToDelete, setHabitToDelete] = useState(null);

  // Popover on hover
  const [openPopoverId, setOpenPopoverId] = useState(null);

  async function loadAll() {
    setLoading(true); setErr("");
    try {
      const [g, h, p] = await Promise.all([
        getJSON(`${API}/goals`),
        getJSON(`${API}/habits`),
        getJSON(`${API}/habits/progress`)
      ]);
      setGoals(Array.isArray(g) ? g : []);
      setHabits(Array.isArray(h) ? h : []);
      const map = {};
      (Array.isArray(p) ? p : []).forEach(x => { map[x.habit_id] = x; });
      setProgress(map);
    } catch (e) { console.error(e); setErr("Nie udało się pobrać danych."); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  const habitsByGoal = useMemo(() => {
    const m = new Map();
    for (const h of habits) {
      const gid = h.goal_id ?? 0;
      if (!m.has(gid)) m.set(gid, []);
      m.get(gid).push(h);
    }
    return m;
  }, [habits]);

  function onGoalCreated(goal) {
    setGoals(g => [goal, ...g]);
    setShowGoalForm(false);
  }
  function onHabitCreated(habit) {
    setHabits(hs => [habit, ...hs]);
    setOpenFormFor(null);
  }

  async function deleteGoal(goalId) {
    if (!goalId) return;
    const g = goals.find(x => x.id === Number(goalId));
    if (!g) return;
    if (!confirm(`Usunąć cel „${g.title}” wraz z nawykami?`)) return;
    try {
      await del(`${API}/goals/${g.id}`);
      setGoals(gs => gs.filter(x => x.id !== g.id));
      setHabits(hs => hs.filter(h => h.goal_id !== g.id));
      setShowDeleteGoalForm(false);
      setGoalToDelete(null);
    } catch (e) {
      console.error(e);
      setErr("Nie udało się usunąć celu.");
    }
  }

  async function deleteHabitById(habitId) {
    const h = habits.find(x => x.id === Number(habitId));
    if (!h) return;
    if (!confirm(`Usunąć nawyk „${h.title}”?`)) return;
    try {
      await del(`${API}/habits/${h.id}`);
      setHabits(hs => hs.filter(x => x.id !== h.id));
      setProgress(p => {
        const c = { ...p };
        delete c[h.id];
        return c;
      });
    } catch (e) {
      console.error(e);
      setErr("Nie udało się usunąć nawyku.");
    }
  }

  const totalHabits = habits.length;
  const totalGoals = goals.length;

  return (
    <div className="stats-habits">
      <header className="panel-head">
        <div className="panel-title">
          <h2>Nawyki i cele</h2>
          <p className="panel-sub">Zarządzaj celami i nawykami, śledź serię tygodniową.</p>
        </div>
        <div className="stats">
          <div>Nawyki&nbsp;<strong>{totalHabits}</strong></div>
          <div>Cele&nbsp;<strong>{totalGoals}</strong></div>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn small"
            onClick={() => setShowGoalForm(v => !v)}
            aria-expanded={showGoalForm}
          >
            {showGoalForm ? "✕ Zamknij" : "➕ Dodaj cel"}
          </button>
          <button
            type="button"
            className="btn small danger"
            onClick={() => setShowDeleteGoalForm(v => !v)}
            aria-expanded={showDeleteGoalForm}
          >
            {showDeleteGoalForm ? "✕ Anuluj" : "🗑 Usuń cel"}
          </button>
          <button type="button" className="btn small" onClick={loadAll} disabled={loading}>
            {loading ? "Odświeżanie…" : "⟳ Odśwież"}
          </button>
        </div>
      </header>

      {showGoalForm && (
        <div className="inline-form">
          <CreateGoalForm onCreated={onGoalCreated} onCancel={() => setShowGoalForm(false)} />
        </div>
      )}

      {showDeleteGoalForm && (
        <div className="inline-form">
          <label style={{ marginRight: ".5rem" }}>Wybierz cel do usunięcia:</label>
          <select
            value={goalToDelete ?? ""}
            onChange={(e) => setGoalToDelete(e.target.value || null)}
          >
            <option value="">—</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <button
            type="button"
            className="btn small danger"
            onClick={() => deleteGoal(goalToDelete)}
            disabled={!goalToDelete}
            style={{ marginLeft: ".5rem" }}
          >
            Usuń wybrany
          </button>
        </div>
      )}

      {err && <div className="form-error">{err}</div>}

      <section className="goals-grid">
        {goals.length === 0 && (
          <div className="empty">Brak celów. Dodaj pierwszy, aby zacząć.</div>
        )}
        {goals.map((g) => {
          const list = habitsByGoal.get(g.id) || [];
          const formOpen = openFormFor === g.id;
          const delOpen = openDeleteForGoal === g.id;
          return (
            <article className="goal-card" key={g.id}>
              <header className="goal-card-head">
                <h3 title={g.description || ""}>{g.title}</h3>
                <div className="head-actions">
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => setOpenFormFor(formOpen ? null : g.id)}
                  >
                    {formOpen ? "✕ Zamknij" : "➕ Dodaj nawyk"}
                  </button>
                  <button
                    type="button"
                    className="btn small danger"
                    onClick={() => {
                      setOpenDeleteForGoal(prev => prev === g.id ? null : g.id);
                      setHabitToDelete(null);
                    }}
                  >
                    🗑 Usuń nawyk
                  </button>
                </div>
              </header>

              {formOpen && (
                <div className="inline-form">
                  <HabitForm
                    goalId={g.id}
                    onCreated={onHabitCreated}
                    onCancel={() => setOpenFormFor(null)}
                  />
                </div>
              )}

              {delOpen && (
                <div className="inline-form">
                  <label style={{ marginRight: ".5rem" }}>Usuń nawyk:</label>
                  <select
                    value={habitToDelete ?? ""}
                    onChange={(e) => setHabitToDelete(e.target.value || null)}
                  >
                    <option value="">—</option>
                    {list.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn small danger"
                    disabled={!habitToDelete}
                    onClick={() => {
                      deleteHabitById(habitToDelete);
                      setHabitToDelete(null);
                      setOpenDeleteForGoal(null);
                    }}
                    style={{ marginLeft: ".5rem" }}
                  >
                    Usuń
                  </button>
                </div>
              )}

              <ul className="habit-list">
                {list.length === 0 ? (
                  <li className="empty small">Brak nawyków.</li>
                ) : (
                  list.map(h => {
                    const pr = progress[h.id] || { week_done: 0, week_target: 0, streak: 0 };
                    const streakStyle = { fontSize: "clamp(.8rem, .76rem + .25vw, .95rem)" }; // prawa część skaluje się
                    return (
                      <li
                        className="habit-item"
                        key={h.id}
                        style={{ position: "relative" }}
                        onMouseEnter={() => setOpenPopoverId(h.id)}
                        onMouseLeave={() => setOpenPopoverId(prev => (prev === h.id ? null : prev))}
                      >
                        <button className="habit-chip" type="button" style={chipStyle(h)}>
                          <span className="dot" style={{ background: h.color || "#CCC" }} />
                          <span
                            className="title"
                            style={{
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: "clamp(.9rem, .85rem + .3vw, 1.06rem)" // nazwa skaluje się
                            }}
                          >
                            {h.title}
                          </span>
                          <span
                            className="streak"
                            style={streakStyle}
                            title={`Zrobione w tym tygodniu: ${pr.week_done}/${pr.week_target} • Ciąg: ${pr.streak} dni`}
                          >
                            <span className="flame">🔥</span>
                            Seria: {pr.week_done}/{pr.week_target}
                          </span>
                        </button>

                        {openPopoverId === h.id && (
                          <HabitPopover habit={h} progress={pr} />
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </article>
          );
        })}
      </section>
    </div>
  );
}
