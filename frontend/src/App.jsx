// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";

import Calendar from "./components/Calendar/Calendar.jsx";
import ProjectsView from "./components/Projects/ProjectsView.jsx";
import StatsHabits from "./components/Goals&Habits/StatsHabits.jsx";

/** Mini-selektor motywu – pokazujemy TYLKO ciemny (jasny ukryty) */
function ThemeSelect() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="theme-toggle" style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
      <span style={{ opacity: .8 }}>Motyw</span>
      <select
        aria-label="Wybierz motyw"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        {/* tylko ciemny; jasny schowany */}
        <option value="dark">Ciemny</option>
        <option value="light" hidden>Jasny</option>
      </select>
    </div>
  );
}

export default function App() {
  // Ustaw domyślnie CIEMNY przy pierwszym uruchomieniu
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (!saved) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  return (
    <Router>
      <div className="app-shell">
        <header className="app-header" style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span role="img" aria-label="folder">📁</span> Organizer
            </span>

            <nav style={navStyle}>
              <NavLink to="/calendar" className="nav-link">Kalendarz</NavLink>
              <NavLink to="/projects" className="nav-link">Projekty</NavLink>
              <NavLink to="/goals" className="nav-link">Cele i Nawyki</NavLink>
              {/* "Lista zadań" i "Pomodoro" ukryte */}
            </nav>
          </div>

          {/* selektor motywu – tylko ciemny */}
          <ThemeSelect />
        </header>

        <main style={contentStyle}>
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/projects" element={<ProjectsView />} />
            <Route path="/goals" element={<StatsHabits />} />
            {/* trasy /tasks i /pomodoro usunięte */}
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "var(--panel)",
  borderBottom: "1px solid var(--border)",
  padding: ".6rem 1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "var(--shadow)",
  borderRadius: "0 0 14px 14px",
  fontFamily: '"Oxanium", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  fontWeight: 700,
};

const navStyle = {
  display: "flex",
  gap: ".4rem",
  alignItems: "center",
  flexWrap: "wrap",
};

const contentStyle = {
  padding: "1rem",
  maxWidth: 1200,
  margin: "0 auto",
};
