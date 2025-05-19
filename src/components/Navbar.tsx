import { useState, useEffect } from "react";
import { Home, Search, Map, BookOpen, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(location.pathname);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      setIsLoggedIn(!!session.session);
    };
    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const handleTabClick = (path: string) => {
    setActiveTab(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-4 left-0 right-0 bg-gray-900 dark:bg-gray-800 border-t border-gray-700 flex justify-around py-3 px-4 z-10 rounded-2xl shadow-lg mx-4">
      <Link
        to="/"
        onClick={() => handleTabClick("/")}
        className={`flex items-center p-2 rounded-full transition-all duration-300 ${
          isActive("/") ? "bg-[#17a34a] text-white px-4" : "text-gray-400 hover:text-white"
        }`}
      >
        <Home size={24} />
        {isActive("/") && (
          <span className="ml-2 text-sm font-medium animate-slide-in">Home</span>
        )}
      </Link>

      <Link
        to="/activities"
        onClick={() => handleTabClick("/activities")}
        className={`flex items-center p-2 rounded-full transition-all duration-300 ${
          isActive("/activities") ? "bg-[#17a34a] text-white px-4" : "text-gray-400 hover:text-white"
        }`}
      >
        <Map size={24} />
        {isActive("/activities") && (
          <span className="ml-2 text-sm font-medium animate-slide-in">Activities</span>
        )}
      </Link>

      <Link
        to="/search"
        onClick={() => handleTabClick("/search")}
        className={`flex items-center p-2 rounded-full transition-all duration-300 ${
          isActive("/search") ? "bg-[#17a34a] text-white px-4" : "text-gray-400 hover:text-white"
        }`}
      >
        <Search size={24} />
        {isActive("/search") && (
          <span className="ml-2 text-sm font-medium animate-slide-in">Search</span>
        )}
      </Link>

      <Link
        to="/guides"
        onClick={() => handleTabClick("/guides")}
        className={`flex items-center p-2 rounded-full transition-all duration-300 ${
          isActive("/guides") ? "bg-[#17a34a] text-white px-4" : "text-gray-400 hover:text-white"
        }`}
      >
        <BookOpen size={24} />
        {isActive("/guides") && (
          <span className="ml-2 text-sm font-medium animate-slide-in">Guides</span>
        )}
      </Link>

      <Link
        to={isLoggedIn ? "/profile" : "/auth"}
        onClick={() => handleTabClick(isLoggedIn ? "/profile" : "/auth")}
        className={`flex items-center p-2 rounded-full transition-all duration-300 ${
          isActive(isLoggedIn ? "/profile" : "/auth") ? "bg-[#17a34a] text-white px-4" : "text-gray-400 hover:text-white"
        }`}
      >
        <User size={24} />
        {isActive(isLoggedIn ? "/profile" : "/auth") && (
          <span className="ml-2 text-sm font-medium animate-slide-in">Profile</span>
        )}
      </Link>

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-in-out;
        }
      `}</style>
    </nav>
  );
}
