import { useState, useEffect } from "react";
import { Home, Search, LayoutGrid, User, EllipsisVertical, LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CreateMenu } from "@/components/sc/CreateMenu";

type Tab = { label: string; to: string; icon: LucideIcon; match: (path: string) => boolean };

// Floating pill tab bar: Home, Activities, the create menu, Search, Profile.
export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      setIsLoggedIn(!!session.session);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const path = location.pathname;
  const tabs: Tab[] = [
    { label: "Home", to: "/", icon: Home, match: (p) => p === "/" },
    {
      label: "Activities",
      to: "/activities",
      icon: LayoutGrid,
      match: (p) =>
        ["/activities", "/matches", "/cycling-activities", "/guides", "/venues", "/landmarks"].some((r) => p === r || p.startsWith(r + "/")),
    },
    { label: "Search", to: "/search", icon: Search, match: (p) => p.startsWith("/search") },
    {
      label: "Profile",
      to: isLoggedIn ? "/profile" : "/auth",
      icon: User,
      match: (p) => p.startsWith("/profile") || p.startsWith("/auth"),
    },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed z-40 left-5 right-5 h-[68px] rounded-[34px] bg-white/90 backdrop-blur-xl shadow-nav flex items-center justify-between px-2"
      style={{ bottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
    >
      {tabs.map((t, i) => {
        const active = t.match(path);
        const Icon = t.icon;
        const link = (
          <Link
            key={t.label}
            to={t.to}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "h-[52px] rounded-full flex items-center justify-center gap-2 transition-all duration-300",
              active ? "bg-sc-ink text-white px-5" : "w-[52px] text-sc-ink2 active:scale-95"
            )}
          >
            <Icon size={active ? 22 : 24} strokeWidth={active ? 2 : 1.9} />
            {active && <span className="text-[15px] font-bold animate-[sc-slide-in_0.3s_ease-out]">{t.label}</span>}
          </Link>
        );
        if (i !== 1) return link;
        return [
          link,
          <button
            key="create-menu"
            type="button"
            aria-label="More options"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-sc-ink2 active:scale-95 transition-all duration-300"
          >
            <EllipsisVertical size={24} strokeWidth={1.9} />
          </button>,
        ];
      })}
      <CreateMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <style>{`
        @keyframes sc-slide-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </nav>
  );
}
