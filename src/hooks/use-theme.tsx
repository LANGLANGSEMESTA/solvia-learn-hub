import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("solvia-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = getInitial();
    setTheme(t);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("solvia-theme", theme);
    } catch {}
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}
