import React, { useState } from "react";
import "./CreateGoalForm.css";

const API = import.meta.env.VITE_API_URL || "";

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const isJSON = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJSON ? JSON.parse(text || "{}") : null;
  if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : text);
  return data;
}

export default function CreateGoalForm({ onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    } catch (e) { console.error(e); setError("Nie udało się dodać celu."); }
    finally { setSaving(false); }
  }

  return (
    <div className="create-goal-form">
      <h3>Dodaj cel</h3>

      <form className="goal-form" onSubmit={submit}>
        <div className="form-group full">
          <label htmlFor="cgf-title">
            Nazwa celu<span className="req" aria-hidden="true">*</span>:
          </label>
          <input
            id="cgf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Kondycja"
            required
          />
        </div>

        <div className="form-group full">
          <label htmlFor="cgf-desc">Opis:</label>
          <textarea
            id="cgf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="krótki opis"
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
