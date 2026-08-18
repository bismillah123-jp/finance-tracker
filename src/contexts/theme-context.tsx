"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("fintrack-theme") as Theme) || "dark";
    setTheme(saved);
    applyTheme(saved);
    setMounted(true);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    // Set all required selectors
    root.setAttribute("data-theme", t);
    root.classList.remove("dark", "light");
    root.classList.add(t);
    // Force body background & color directly for browsers that miss CSS vars
    document.body.style.backgroundColor = t === "dark" ? "#0F172A" : "#F8FAFC";
    document.body.style.color = t === "dark" ? "#F1F5F9" : "#0F172A";
    document.body.setAttribute("data-theme", t);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0F172A" : "#F8FAFC");
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fintrack-theme", next);
    applyTheme(next);
  }

  // Prevent flash of wrong theme on mount
  if (!mounted) {
    return (
      <div style={{ backgroundColor: "#0F172A", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
