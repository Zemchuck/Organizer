import React, { useEffect, useMemo, useState } from "react";
import SingleTaskForm from "./SingleTaskForm.jsx";
import "./ProjectsView.css";

const API = import.meta.env.VITE_API_URL || "/api";

/* helpers */
async function getJSON(url) {
  const r = await fetch(url);
  const text = await r.text();
  const isJSON = (r.headers.get("content-type") || "").includes("application/json");
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0,150)}`);
  return isJSON ? JSON.parse(text || "{}") : null;
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const isJSON = (r.headers.get("content-type") || "").includes("application/json");
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0,150)}`);
  return isJSON ? JSON.parse(text || "{}") : null;
}
async function patchJSON(url, body) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const isJSON = (r.headers.get("content-type") || "").includes("application/json");
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0,150)}`);
  return isJSON ? JSON.parse(text || "{}") : null;
}
async function del(url) {
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status}: ${text.slice(0,150)}`);
  }
}

/* UI utils (chip kolor) */
function hexToRgb(hex) {
  if (!hex) return null;
  const m = String(hex).trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function chipStyle(color) {
  const rgb = hexToRgb(color || "#7a7a7a");
  const bg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)` : "var(--surface-2)";
  const border = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)` : "var(--border)";
  return { background: bg, borderColor: border, boxShadow: rgb ? `inset 0 0 0 1px rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : "none" };
}

export default function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [openTaskFormFor, setOpenTaskFormFor] = useState(null); // project_id
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadAll() {
    setLoading(true); setErr("");
    try {
      const [proj, all] = await Promise.all([
        getJSON(`${API}/projects`),
        getJSON(`${API}/tasks/all`),
      ]);
      setProjects(proj || []);
      setTasks(all || []);
    } catch (e) {
      console.error(e); setErr("Nie udało się pobrać projektów/zadań.");
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  const tasksByProject = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!t.project_id) continue;
      map.has(t.project_id) || map.set(t.project_id, []);
      map.get(t.project_id).push(t);
    }
    for (const [pid, arr] of map.entries()) {
      arr.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      map.set(pid, arr);
    }
    return map;
  }, [tasks]);

  function onProjectCreated(created) {
    setProjects(p => [...p, created]);
    setShowProjectForm(false);
  }
  function onTaskCreated(created) {
    const arr = Array.isArray(created) ? created : [created];
    setTasks(ts => [...ts, ...arr]);
    setOpenTaskFormFor(null);
  }

  async function toggleDone(task) {
    try {
      const updated = await patchJSON(`${API}/tasks/${task.id}`, { status: !task.status });
      setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
    } catch (e) { console.error(e); }
  }
  async function removeTask(task) {
    if (!confirm(`Usunąć zadanie „${task.title}”?`)) return;
    try {
      await del(`${API}/tasks/${task.id}`);
      setTasks(ts => ts.filter(t => t.id !== task.id));
      if (openPopoverId === task.id) setOpenPopoverId(null);
    } catch (e) { console.error(e); }
  }

  /* ——— inline CreateProject ——— */
  function CreateProjectInline() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function submit(e) {
      e.preventDefault(); setError("");
      if (!title.trim()) return setError("Podaj nazwę projektu.");
      try {
        setSaving(true);
        const created = await postJSON(`${API}/projects`, { title: title.trim(), description: description || null });
        onProjectCreated(created);
        setTitle(""); setDescription("");
      } catch (e) { console.error(e); setError("Nie udało się dodać projektu."); }
      finally { setSaving(false); }
    }
    return (
      <form className="project-form" onSubmit={submit}>
        <h3>Dodaj projekt</h3>
        <div className="row">
          <div className="proj-title">
            <label>Nazwa projektu <span className="req">*</span>:</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} required />
          </div>
          <div className="proj-desc">
            <label>Opis:</label>
            <input value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="row submit">
          <button type="button" className="submit-btn ghost" onClick={()=>setShowProjectForm(false)} disabled={saving}>Anuluj</button>
          <button type="submit" className="submit-btn" disabled={saving}>{saving ? "Zapisywanie…" : "Zatwierdź"}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="projects-wrap">
      <div className="panel-head">
        {/* ✅ nagłówek z liczbą projektów */}
        <h2>Liczba projektów: <span className="count">{projects.length}</span></h2>
        <div className="head-actions">
          <button type="button" className="btn small" onClick={() => setShowProjectForm(v => !v)}>
            {showProjectForm ? "✕ Zamknij" : "➕ Dodaj projekt"}
          </button>
          <button type="button" className="btn small" onClick={loadAll} disabled={loading}>
            {loading ? "Odświeżanie…" : "⟳ Odśwież"}
          </button>
        </div>
      </div>

      {showProjectForm && <CreateProjectInline />}

      <div className="projects-grid">
        {projects.length === 0 && !err && <div className="empty">Brak projektów</div>}

        {projects.map((p) => {
          const list = tasksByProject.get(p.id) || [];
          const openCount = list.filter(t => !t.status).length;
          const totalCount = list.length;
          const formOpen = openTaskFormFor === p.id;

          return (
            <section key={p.id} className="project-card">
              <header className="project-card-head">
                <div className="left">
                  <h3 title={p.description || ""}>{p.title}</h3>
                  {/* ✅ licznik obok nazwy projektu */}
                  <span className="count-badge">Liczba zadań <strong>{openCount}/{totalCount}</strong></span>
                </div>
                <div className="head-actions">
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => setOpenTaskFormFor(formOpen ? null : p.id)}
                  >
                    {formOpen ? "✕ Zamknij" : "➕ Dodaj zadanie"}
                  </button>
                </div>
              </header>

              {formOpen && (
                <div className="inline-form">
                  <SingleTaskForm
                    projectId={p.id}
                    onCreated={onTaskCreated}
                    onCancel={() => setOpenTaskFormFor(null)}
                  />
                </div>
              )}

              <ol className="task-list">
                {list.length === 0 ? (
                  <li className="empty">Brak zadań w tym projekcie</li>
                ) : (
                  list.map((t) => {
                    const open = openPopoverId === t.id;
                    const timeStr = t.time ? new Date(t.time).toLocaleString() : "—";
                    return (
                      <li key={t.id} className={`task-item ${t.status ? "done" : ""}`}>
                        <div
                          className="task-chip"
                          style={chipStyle(t.color)}
                          tabIndex={0}
                          onMouseEnter={() => setOpenPopoverId(t.id)}
                          onMouseLeave={() => setOpenPopoverId((id) => (id === t.id ? null : id))}
                          onFocus={() => setOpenPopoverId(t.id)}
                          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpenPopoverId(null); }}
                          onClick={() => setOpenPopoverId(open ? null : t.id)}
                          aria-haspopup="dialog"
                          aria-expanded={open}
                        >
                          <span className="dot" style={{ background: t.color || "#CCC" }} />
                          <span className="title">{t.title}</span>

                          {open && (
                            <div className="popover" role="dialog">
                              <div className="popover-head">
                                <strong>{t.title}</strong>
                                <span className="status">{t.status ? "Ukończone" : "Otwarte"}</span>
                              </div>
                              <div className="popover-desc">{t.description || "Brak opisu"}</div>
                              <div className="popover-meta">
                                <span>{timeStr}</span>
                                <span>{t.duration}m</span>
                              </div>
                              <div className="popover-actions">
                                <button type="button" className="btn small" onClick={() => toggleDone(t)}>
                                  {t.status ? "Otwórz" : "Ukończ"}
                                </button>
                                <button type="button" className="btn small danger" onClick={() => removeTask(t)}>
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
