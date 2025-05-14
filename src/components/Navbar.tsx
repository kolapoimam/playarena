import { useState, useEffect } from "react";
import { Home, Search, Map, BookOpen, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 border-t border-border flex justify-around py-3 px-4 z-10 rounded-t-2xl shadow-lg">
      <Link 
        to="/" 
        className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-playarena-600' : 'text-muted-foreground'} hover:scale-110 transition-transform`}
      >
        <Home size={28} />
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link 
        to="/search" 
        className={`flex flex-col items-center p-2 ${isActive('/search') ? 'text-playarena-600' : 'text-muted-foreground'} hover:scale-110 transition-transform`}
      >
        <Search size={28} />
        <span className="text-xs mt-1">Search</span>
      </Link>
      <Link 
        to="/matches" 
        className={`flex flex-col items-center p-2 ${isActive('/matches') ? 'text-playarena-600' : 'text-muted-foreground'} hover:scale-110 transition-transform`}
      >
        <Map size={28} />
        <span className="text-xs mt-1">Matches</span>
      </Link>
      <Link 
        to="/guides" 
        className={`flex flex-col items-center p-2 ${isActive('/guides') ? 'text-playarena-600' : 'text-muted-foreground'} hover:scale-110 transition-transform`}
      >
        <BookOpen size={28} />
        <span className="text-xs mt-1">Guides</span>
      </Link>
      <Link 
        to={isLoggedIn ? "/profile" : "/auth"} 
        className={`flex flex-col items-center p-2 ${isActive(isLoggedIn ? '/profile' : '/auth') ? 'text-playarena-600' : 'text-muted-foreground'} hover:scale-110 transition-transform`}
      >
        <User size={28} />
        <span className="text-xs mt-1">Profile</span>
      </Link>
    </nav>
  );
}
