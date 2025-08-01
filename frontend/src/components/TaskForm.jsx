import React, { useState } from "react";
import "./TaskForm.css";

/**
 * TaskForm – formularz dodawania zadań.
 *
 * Props opcjonalne:
 *   defaultDate (Date)   – domyślna data (np. kliknięty dzień w kalendarzu),
 *   defaultTime (string) – domyślna godzina „HH:MM”
 *   onAdded(taskObj)     – wywołane po udanym dodaniu (możesz ponownie pobrać dane)
 *   onClose()            – opcjonalne zamknięcie modala / formularza
 */
export default function TaskForm({
  defaultDate,
  defaultTime = "",
  onAdded,
  onClose,
}) {
  /* --- stany pól --- */
  const [title, setTitle]       = useState("");
  const [date, setDate]         = useState(
    defaultDate
      ? defaultDate.toISOString().slice(0, 10)
      : ""
  );
  const [time, setTime]         = useState(defaultTime);
  const [type, setType]         = useState("single");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  /* --- obsługa submit --- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !date || !time) {
      setError("Uzupełnij wszystkie wymagane pola.");
      return;
    }

    const payload = {
      title: title.trim(),
      date,
      time,
      task_type: type,
    };

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Błąd API: ${res.status}`);
      }

      const newTask = await res.json();
      /* powiadom rodzica (odświeżenie widoku) */
      onAdded?.(newTask);

      /* reset / zamknij */
      setTitle("");
      setTime("");
      if (!defaultDate) setDate("");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError("Nie udało się zapisać zadania.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Tytuł zadania"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="single">Jednorazowe</option>
        <option value="habit">Nawyk</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? "Zapisywanie…" : "Dodaj"}
      </button>

      {error && <span className="task-error">{error}</span>}
    </form>
  );
}