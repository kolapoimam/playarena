// ThemeToggle.tsx
// The redesigned app ships in light mode only. useTheme always applies the
// light theme and clears any saved dark preference, and ThemeToggle renders nothing.
import { useEffect } from "react";

export const useTheme = () => {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("theme", "light");
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, []);

  return { theme: "light" as const, toggleTheme: () => {} };
};

export default function ThemeToggle() {
  useTheme();
  return null;
}
