"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("mentormeup-theme") as Theme | null;
    const initialTheme = savedTheme || "dark";
    setThemeState(initialTheme);
    
    // Remove both classes first, then add the correct one
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);
    
    // Set background color
    document.documentElement.style.backgroundColor = initialTheme === "light" ? "#F8F9FA" : "#080B14";
  }, []);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("mentormeup-theme", theme);
      
      // Remove both classes first, then add the correct one
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      
      // Update background color on html element
      document.documentElement.style.backgroundColor = theme === "light" ? "#F8F9FA" : "#080B14";
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
