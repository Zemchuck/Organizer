// src/components/EisenhowerMatrix.jsx
import React, { useEffect, useState } from "react";
import "./EisenhowerMatrix.css";

const API = import.meta.env.VITE_API_URL || "/api";

export default function EisenhowerMatrix() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    fetch(`${API}/tasks/all`)
      .then((r) => r.json())
      .then(setTasks);
  }, []);

  const q = { 1: [], 2: [], 3: [], 4: [] };
  tasks.forEach((t) => q[t.priority].push(t));
  const L = {
    1: ["Pilne", "Ważne"],
    2: ["Niepilne", "Ważne"],
    3: ["Pilne", "Nieważne"],
    4: ["Niepilne", "Nieważne"],
  };

  return (
    <div className="matrix">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`quadrant q${i}`}>
          <h3>Q{i}</h3>
          <small>
            {L[i][0]} · {L[i][1]}
          </small>
          <ul>
            {q[i].map((t) => (
              <li key={t.id} className={t.status ? "completed" : ""}>
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}