import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Calendar from "./components/Calendar";
import StatsHabits from "./components/StatsHabits";
import EisenhowerMatrix from "./components/EisenhowerMatrix";

export default function App() {
  return (
    <Router>
      <div className="app">
        {/* ✅ Pasek nawigacji */}
        <nav className="menu">
          <Link to="/">Kalendarz</Link>
          <Link to="/stats-habits">Statystyki nawyków</Link>
          <Link to="/matrix">Macierz Eisenhowera</Link>
        </nav>

        {/* ✅ Routing */}
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/stats-habits" element={<StatsHabits />} />
          <Route path="/matrix" element={<EisenhowerMatrix />} />
        </Routes>
      </div>
    </Router>
  );
}