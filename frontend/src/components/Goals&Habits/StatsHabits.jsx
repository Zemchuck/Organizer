import React, { useEffect, useMemo, useState } from "react";
import "./StatsHabits.css";
import CreateGoalForm from "./CreateGoalForm.jsx";
import HabitForm from "./HabitForm.jsx";

const API = import.meta.env.VITE_API_URL || "";

/* --- helpers --- */
async function getJSON(url) {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,150)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON, got: ${ct}`);
  return JSON.parse(text || "{}");
}
async function patchJSON(url, payload) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,150)}`);
  return text ? JSON.parse(text) : null;
}
async function del(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0,150)}`);
  }
}

const DOW = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];
const hhmm = (t) => (t ? String(t).slice(0,5) : "");
const daysLabel = (arr=[]) => arr.length ? arr.map(i => DOW[i]).join("·") : "—";

function hexToRgb(hex) {
  if (!hex) return null;
  const m = String(hex).trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function chipStyle(h) {
  const rgb = hexToRgb(h?.color || "#7a7a7a");
  const bg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)` : "var(--surface-2)";
  const border = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)` : "var(--border)";
  return {
    background: bg,
    borderColor: border,
    boxShadow: rgb ? `inset 0 0 0 1px rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : "none",
  };
}

export default function StatsHabits() {
  const [stats, setStats]   = useState({ total_habits: 0, active_habits: 0 });
  const [goals, setGoals]   = useState([]);
  const [habits, setHabits] = useState([]);
  const [openFormFor, setOpenFormFor] = useState(null);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false); // ⟵ NEW
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true); setErr("");
    try {
      const [s, g, h] = await Promise.all([
        getJSON(`${API}/habits/stats`),
        getJSON(`${API}/goals`),
        getJSON(`${API}/habits`)
      ]);
      setStats(s || { total_habits: 0, active_habits: 0 });
      setGoals(Array.isArray(g) ? g : []);
      setHabits(Array.isArray(h) ? h : []);
    } catch (e) { console.error(e); setErr("Nie udało się pobrać danych."); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  const habitsByGoal = useMemo(() => {
    const map = new Map();
    for (const h of habits) {
      if (!map.has(h.goal_id)) map.set(h.goal_id, []);
      map.get(h.goal_id).push(h);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      map.set(k, arr);
    }
    return map;
  }, [habits]);

  function onGoalCreated(created) {
    setGoals((gs) => [...gs, created]);
    setShowGoalForm(false); // zamknij po stworzeniu
  }

  function onHabitCreated(created) {
    setHabits((hs) => [...hs, created]);
    setStats((s) => ({
      total_habits: (s?.total_habits ?? 0) + 1,
      active_habits: (s?.active_habits ?? 0) + (created.active ? 1 : 0),
    }));
    setOpenFormFor(null);
  }

  async function toggleActive(h) {
    try {
      const updated = await patchJSON(`${API}/habits/${h.id}`, { active: !h.active });
      setHabits((hs) => hs.map(x => x.id === h.id ? updated : x));
      setStats((s) => ({
        total_habits: s.total_habits,
        active_habits: s.active_habits + (updated.active ? 1 : 0) - (h.active ? 1 : 0),
      }));
    } catch (e) { console.error(e); setErr("Nie udało się przełączyć statusu nawyku."); }
  }
  async function removeHabit(h) {
    if (!confirm(`Usunąć nawyk „${h.title}”?`)) return;
    try {
      await del(`${API}/habits/${h.id}`);
      setHabits((hs) => hs.filter(x => x.id !== h.id));
      setStats((s) => ({
        total_habits: Math.max(0, s.total_habits - 1),
        active_habits: Math.max(0, s.active_habits - (h.active ? 1 : 0)),
      }));
      if (openPopoverId === h.id) setOpenPopoverId(null);
    } catch (e) { console.error(e); setErr("Nie udało się usunąć nawyku."); }
  }

  return (
    <div className="stats-habits">
      <div className="panel-head">
        <h2>Nawyki &amp; Cele</h2>
        <div className="stats">
          <div>Aktywne&nbsp;<strong>{stats?.active_habits ?? 0}</strong></div>
          <div>Łącznie&nbsp;<strong>{stats?.total_habits ?? 0}</strong></div>
        </div>
        <div className="head-actions" style={{display:"flex", gap:".4rem"}}>
          <button
            type="button"
            className="btn small"
            onClick={() => setShowGoalForm(v => !v)}
            aria-expanded={showGoalForm}
          >
            {showGoalForm ? "✕ Zamknij" : "➕ Dodaj cel"}
          </button>
          <button type="button" className="btn small" onClick={loadAll} disabled={loading}>
            {loading ? "Odświeżanie…" : "⟳ Odśwież"}
          </button>
        </div>
      </div>

      {showGoalForm && (
        <div className="inline-form">
          <CreateGoalForm onCreated={onGoalCreated} onCancel={() => setShowGoalForm(false)} />
        </div>
      )}

      <div className="goals-grid">
        {goals.length === 0 && !err && <div className="empty">Brak celów</div>}

        {goals.map((g) => {
          const list = habitsByGoal.get(g.id) || [];
          const formOpen = openFormFor === g.id;
          return (
            <section key={g.id} className="goal-card">
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

              <ol className="habit-list">
                {list.length === 0 ? (
                  <li className="empty">Brak nawyków powiązanych z tym celem</li>
                ) : (
                  list.map((h) => {
                    const open = openPopoverId === h.id;
                    return (
                      <li key={h.id} className={`habit-item ${h.active ? "" : "inactive"}`}>
                        <div
                          className="habit-chip"
                          style={chipStyle(h)}
                          tabIndex={0}
                          onMouseEnter={() => setOpenPopoverId(h.id)}
                          onMouseLeave={() => setOpenPopoverId((id) => (id === h.id ? null : id))}
                          onFocus={() => setOpenPopoverId(h.id)}
                          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpenPopoverId(null); }}
                          onClick={() => setOpenPopoverId(open ? null : h.id)}
                          aria-haspopup="dialog"
                          aria-expanded={open}
                        >
                          <span className="dot" style={{ background: h.color || "#CCC" }} />
                          <span className="title">{h.title}</span>

                          {open && (
                            <div className="popover" role="dialog">
                              <div className="popover-head">
                                <strong>{h.title}</strong>
                                <span className="status">{h.active ? "Aktywny" : "Wstrzymany"}</span>
                              </div>
                              <div className="popover-desc">{h.description || "Brak opisu"}</div>
                              <div className="popover-meta">
                                <span>Data rozpoczęcia: {h.start_date}</span>
                                <span>Godzina: {hhmm(h.time_of_day)}</span>
                                <span>Czas trwania: {h.duration}m</span>
                                <span>Dni powtarzania: {daysLabel(h.repeat_days)}</span>
                              </div>
                              <div className="popover-actions">
                                <button type="button" className="btn small" onClick={() => toggleActive(h)}>
                                  {h.active ? "Wstrzymaj" : "Aktywuj"}
                                </button>
                                <button type="button" className="btn small danger" onClick={() => removeHabit(h)}>
                                  Usuń
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ol>
            </section>
          );
        })}
      </div>

      {err && <div className="form-error">{err}</div>}
    </div>
  );
}
