import React, { useState } from "react";
import "./CreateGoalForm.css";

// ✅ domyślnie "/api" (proxy przez Vite) lub pełny URL z .env
const API = import.meta.env.VITE_API_URL || "/api";

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) {
    const msg = text.slice(0, 180) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!ct.includes("application/json")) throw new Error(`API zwróciło ${ct}`);
  return JSON.parse(text || "null");
}

export default function CreateGoalForm({ onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showHints, setShowHints] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Podaj nazwę celu.");
    try {
      setSaving(true);
      const created = await postJSON(`${API}/goals`, {
        title: title.trim(),
        description: description || null,
      });
      onCreated?.(created);
      setTitle("");
      setDescription("");
    } catch (e) {
      console.error(e);
      setError("Nie udało się dodać celu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="create-goal-form">
      <h3>Dodaj cel</h3>

      <form className="goal-form" onSubmit={submit}>
        <div className="form-group full">
          <label htmlFor="cgf-title">
            Nazwa celu<span className="req" aria-hidden="true">*</span>:
          </label>
          <div className="input-with-hint">
            <input
              id="cgf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button
              type="button"
              className="hint-btn"
              onClick={() => setShowHints(!showHints)}
              title="Pokaż wskazówki SMART"
            >
              ℹ️
            </button>
          </div>
          {showHints && (
            <div className="goal-hints-popover">
              <div className="hints-grid">
                <div className="hint-column">
                  <h4>Wynik - Jak sformułować cel SMART?</h4>
                  <ul>
                    <li><b>S</b> – Specific: Cel musi być konkretny.</li>
                    <li><b>M</b> – Measurable: Powinien dać się zmierzyć.</li>
                    <li><b>A</b> – Achievable: Musi być realistyczny.</li>
                    <li><b>R</b> – Relevant: Powinien być istotny dla Ciebie.</li>
                    <li><b>T</b> – Time-bound: Określ termin realizacji.</li>
                  </ul>
                  <div className="example">
                    <strong>Przykład:</strong> "Przeczytam 12 książek w 2025 roku"
                  </div>
                </div>
                
                <div className="hint-column">
                  <h4>Tożsamość - (Atomic Habits)</h4>
                  <ul>
                    <li><b>Wskazówka (Cue)</b>: Kiedy i gdzie wykonasz nawyk?</li>
                    <li><b>Pragnienie (Craving)</b>: Co sprawia, że jest atrakcyjny?</li>
                    <li><b>Reakcja (Response)</b>: Zacznij od małych kroków (2 min).</li>
                    <li><b>Nagroda (Reward)</b>: Jak utrzymasz motywację?</li>
                  </ul>
                  <div className="example">
                    <strong>Przykład:</strong> "Jestem osobą, która czyta codziennie"
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-group full">
          <label htmlFor="cgf-desc">Opis:</label>
          <textarea
            id="cgf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="row-bottom">
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "Zapisywanie…" : "Zatwierdź"}
          </button>
          {onCancel && (
            <button type="button" className="submit-btn ghost" onClick={onCancel} disabled={saving}>
              ✕ Anuluj
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
