import React, { useState } from "react";

export default function TaskForm() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !date) return;
    alert(`Dodano zadanie "${title}" na ${date}`);
    setTitle("");
    setDate("");
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input type="text" placeholder="Tytuł zadania" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button type="submit">Dodaj</button>
    </form>
  );
}