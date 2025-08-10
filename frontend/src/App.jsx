import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";

import Calendar from "./components/Calendar.jsx";
import ProjectsView from "./components/ProjectsView.jsx";
import StatsHabits from "./components/StatsHabits.jsx";
import TaskList from "./pages/TaskList.jsx";
import PomodoroTimer from "./components/PomodoroTimer.jsx";

import ThemeToggle from "./components/ThemeToggle.jsx";

export default function App() {
  return (
    <Router>
      <div className="app-shell">
        <header className="app-header" style={headerStyle}>
          <div className="brand" style={brandStyle}>
            <span role="img" aria-label="logo" style={{ marginRight: 8 }}>🗂️</span>
            <strong>Organizer</strong>
          </div>

          <nav className="app-nav" style={navStyle}>
            <NavItem to="/calendar">Kalendarz</NavItem>
            <NavItem to="/projects">Projekty</NavItem>
            <NavItem to="/goals">Cele i Nawyki</NavItem>
            <NavItem to="/tasks">Lista zadań</NavItem>
            <NavItem to="/pomodoro">Pomodoro</NavItem>
          </nav>

          <ThemeToggle />
        </header>

        <main className="app-content" style={contentStyle}>
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<Calendar />} />

            {/* Projekty (taski tylko w ramach projektów) */}
            <Route path="/projects" element={<ProjectsView />} />

            {/* Cele i Nawyki */}
            <Route path="/goals" element={<StatsHabits />} />

            {/* Dodatkowe widoki */}
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/pomodoro" element={<PomodoroTimer />} />

            {/* 404 → do kalendarza */}
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

/* ---------- mała pomocnicza kapsułka do NavLink ---------- */
function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "nav-link" + (isActive ? " active" : "")
      }
      style={({ isActive }) => ({
        padding: "0.45rem 0.7rem",
        borderRadius: 8,
        textDecoration: "none",
        color: "var(--white)",
        border: "1px solid transparent",
        background: isActive ? "rgba(255,255,255,.10)" : "transparent",
      })}
    >
      {children}
    </NavLink>
  );
}

/* ---------- proste inline style (działa bez nowych plików CSS) ---------- */
const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: ".6rem .9rem",
  background: "var(--panel)",
  borderBottom: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const brandStyle = {
  display: "flex",
  alignItems: "center",
  color: "var(--turquoise)",
  fontFamily: "Oxanium, sans-serif",
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
