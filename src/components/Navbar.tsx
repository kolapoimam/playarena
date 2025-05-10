
import { Home, Search, Map, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around py-2 px-4 z-10">
      <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
        <Home size={24} />
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link to="/search" className={`flex flex-col items-center p-2 ${isActive('/search') ? 'text-primary' : 'text-muted-foreground'}`}>
        <Search size={24} />
        <span className="text-xs mt-1">Search</span>
      </Link>
      <Link to="/matches" className={`flex flex-col items-center p-2 ${isActive('/matches') ? 'text-primary' : 'text-muted-foreground'}`}>
        <Map size={24} />
        <span className="text-xs mt-1">Matches</span>
      </Link>
      <Link to="/profile" className={`flex flex-col items-center p-2 ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`}>
        <User size={24} />
        <span className="text-xs mt-1">Profile</span>
      </Link>
    </nav>
  );
}
