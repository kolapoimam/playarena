import { useEffect, useState } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsToggling(true);
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setTimeout(() => setIsToggling(false), 300);
  };

  return { theme, toggleTheme, isToggling };
};

export default function ThemeToggle() {
  const { theme, toggleTheme, isToggling } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1 rounded-full hover:opacity-80 transition-all duration-200"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={theme === "light" ? "#facc15" : "#3b82f6"}
        className={`w-6 h-6 transition-all duration-300 ${isToggling ? "animate-spin" : ""}`}
      >
        {/* Volleyball icon */}
        <circle cx="12" cy="12" r="10" />
        <path
          d="M12 2a10 10 0 0 1 7.07 2.93 10 10 0 0 1-2.93 16.14A10 10 0 0 1 4.93 4.93 10 10 0 0 1 12 2zm0 4a6 6 0 0 0-4.24 1.76 6 6 0 0 0 0 8.48A6 6 0 0 0 12 18a6 6 0 0 0 4.24-1.76 6 6 0 0 0 0-8.48A6 6 0 0 0 12 6z"
          fill={theme === "light" ? "#000000" : "#ffffff"}
          fillOpacity="0.2"
        />
        <path d="M12 2a10 10 0 0 1 5 1.34M12 22a10 10 0 0 1-5-1.34M2 12a10 10 0 0 1 1.34-5M22 12a10 10 0 0 1-1.34 5" />
      </svg>
    </button>
  );
}
