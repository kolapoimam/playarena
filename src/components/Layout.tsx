import { useTheme } from "next-themes";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 p-4 flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm">
        <img
          src={theme === "dark" ? "/playarenadark.png" : "/playarenalight.png"}
          alt="PlayArena Logo"
          className="h-12 w-auto object-contain"
        />
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <Navbar />
    </div>
  );
};

export default Layout;
