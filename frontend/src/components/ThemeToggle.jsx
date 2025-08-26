import React, { useEffect, useState } from "react";

const THEMES = [
  { value: "light", label: "☀️ Jasny" },
  { value: "dark",  label: "🌙 Ciemny" },
  { value: "neon",  label: "⚡ Neon" },
];

const STORAGE_KEY = "theme";

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("dark"); // default

  // init: prefer storage > system
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      applyTheme(stored);
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      applyTheme(initial);
      setTheme(initial);
    }
  }, []);

  const applyTheme = (value) => {
    document.documentElement.dataset.theme = value;
    localStorage.setItem(STORAGE_KEY, value);
  };

  const onChange = (e) => {
    const val = e.target.value;
    setTheme(val);
    applyTheme(val);
  };

  return (
    <label className={`theme-toggle ${className}`}>
      <span style={{ marginRight: 8 }}>Motyw</span>
      <select value={theme} onChange={onChange}>
        {THEMES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </label>
  );
}
