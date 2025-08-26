// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";

import Calendar from "./components/Calendar/Calendar.jsx";
import ProjectsView from "./components/Projects/ProjectsView.jsx";
import StatsHabits from "./components/Goals&Habits/StatsHabits.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

export default function App() {
  return (
    <Router>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-content">
            <span className="app-title">
              <span role="img" aria-label="folder">📁</span> Organizer
            </span>

            <nav className="app-nav">
              <NavLink to="/calendar" className="nav-link">Kalendarz</NavLink>
              <NavLink to="/projects" className="nav-link">Projekty</NavLink>
              <NavLink to="/goals" className="nav-link">Cele i Nawyki</NavLink>
            </nav>
          </div>

          <ThemeToggle />
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/projects" element={<ProjectsView />} />
            <Route path="/goals" element={<StatsHabits />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
