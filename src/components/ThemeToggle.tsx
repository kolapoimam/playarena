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
      className="relative w-16 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 
        bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 hover:opacity-90"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <div
        className={`w-6 h-6 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center
          ${theme === "light" ? "translate-x-0 bg-yellow-400" : "translate-x-8 bg-blue-600"} 
          ${isToggling ? "scale-90" : "scale-100"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme === "light" ? "#ffffff" : "#ffffff"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 ${isToggling ? "animate-pulse" : ""}`}
        >
          {theme === "light" ? (
            // Light bulb icon for light mode
            <path d="M12 2a4 4 0 0 1 4 4c0 2-1 3-1 3h-6s-1-1-1-3a4 4 0 0 1 4-4zm0 12v2m-2 2h4m-6-8v4h6v-4" />
          ) : (
            // Light bulb off icon for dark mode
            <path d="M12 2a4 4 0 0 1 4 4c0 2-1 3-1 3h-6s-1-1-1-3a4 4 0 0 1 4-4zm0 12v2m-2 2h4" />
          )}
        </svg>
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold">
        <span className={theme === "light" ? "text-yellow-600" : "text-gray-400"}>ON</span>
        <span className={theme === "dark" ? "text-blue-400" : "text-gray-400"}>OFF</span>
      </div>
    </button>
  );
}
