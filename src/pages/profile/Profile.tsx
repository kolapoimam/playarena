import React, { useState, useEffect } from "react";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, LogOut, Trophy, Wallet, Volleyball, Settings, Calendar, Bike, BookOpen, Mail, Key, MapPin, ChevronRight, FileText, Medal, ArrowLeft, CircleUserRound, Bell } from "lucide-react";
import Navbar from "@/components/Navbar";

import { Avatar, IconButton, ListRow, Sport, initialsOf } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
const Profile = () => {
  const { toast } = useToast();
  // Show the last known profile at once, then refresh it quietly
  const cached = (() => { try { return JSON.parse(localStorage.getItem("sc_profile_cache") || "null"); } catch { return null; } })();
  const [profile, setProfile] = useState<any>(cached?.profile || null);
  const [isVenueLinked, setIsVenueLinked] = useState<boolean>(!!cached?.venue);
  const [isLoading, setIsLoading] = useState(!cached);
  const [confirmOut, setConfirmOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          localStorage.removeItem("sc_profile_cache");
          navigate("/auth", { replace: true });
          return;
        }
        const [profileRes, venueRes, pinRes] = await Promise.all([
          supabase.from("profiles").select("nickname, gender").eq("id", user.id).maybeSingle(),
          supabase.from("venues").select("id").eq("user_id", user.id).limit(1),
          supabase.from("access_pins").select("id").eq("user_id", user.id).limit(1),
        ]);
        if (!alive) return;
        if (profileRes.error) console.error("Error fetching profile:", profileRes.error);
        const next = { ...user, ...(profileRes.data || {}) };
        const venue = (!venueRes.error && (venueRes.data?.length || 0) > 0) || (!pinRes.error && (pinRes.data?.length || 0) > 0);
        setProfile(next);
        setIsVenueLinked(venue);
        try {
          localStorage.setItem("sc_profile_cache", JSON.stringify({
            profile: { id: next.id, email: next.email, nickname: next.nickname, gender: next.gender, user_metadata: next.user_metadata, created_at: next.created_at },
            venue,
          }));
        } catch { /* storage full or blocked */ }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    load();
    window.scrollTo(0, 0);
    return () => { alive = false; };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("sc_profile_cache");
      toast({
        title: "Success",
        description: "You have been logged out successfully.",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <PageSkeleton />
    );
  }

  const name = profile?.nickname || "Player";
  const rows = (items: { to?: string; href?: string; icon: any; sport: Sport; title: string; sub?: string; onClick?: () => void }[]) => (
    <div className="bg-white rounded-[22px] px-4 py-1 divide-y divide-sc-line">
      {items.map((it) => (
        <ListRow
          key={it.title}
          icon={it.icon}
          sport={it.sport}
          title={it.title}
          subtitle={it.sub}
          onClick={it.onClick || (() => (it.href ? (window.location.href = it.href) : navigate(it.to!)))}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-sc-bg text-sc-ink font-sans pb-32">
      <div className="relative overflow-hidden rounded-b-[40px] bg-sc-green px-5 pb-[26px] flex flex-col gap-[18px]" style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}>
        <Trophy aria-hidden="true" className="absolute text-white/10" size={220} strokeWidth={1} style={{ right: -40, top: 40 }} />
        <div className="relative pt-3 flex justify-end gap-2">
          <IconButton icon={Bell} label="Notifications" onClick={() => navigate("/profile/notifications")} />
          <IconButton icon={Settings} label="Settings" onClick={() => navigate("/profile/settings")} />
        </div>
        <div className="relative flex items-center gap-4">
          <span className="rounded-full border-4 border-white shrink-0 bg-white">
            <Avatar seed={profile?.nickname || profile?.email} gender={profile?.gender} initials={initialsOf(name)} size={80} />
          </span>
          <div className="flex flex-col gap-1 text-sc-green-ink min-w-0">
            <span className="text-2xl font-extrabold tracking-[-0.02em] truncate">{name}</span>
            <span className="text-sm font-bold opacity-80 truncate">{profile?.email}</span>
            <button
              type="button"
              onClick={() => navigate("/profile/view-profile")}
              className="self-start mt-1 h-8 px-3 rounded-full bg-sc-ink text-white text-xs font-bold"
            >
              View profile
            </button>
          </div>
        </div>
      </div>

      <main className="px-5 pt-[18px] flex flex-col gap-3.5">
        <button
          type="button"
          onClick={() => navigate("/profile/badges")}
          className="bg-white rounded-[22px] p-4 flex items-center gap-3 text-left"
        >
          <span className="flex">
            {([
              ["#FACC15", Medal],
              ["#16A34A", Trophy],
              ["#FB923C", Bike],
              ["#8B5CF6", MapPin],
            ] as const).map(([bg, I], k) => (
              <span key={k} className="w-[38px] h-[38px] rounded-full border-[3px] border-white flex items-center justify-center text-white" style={{ background: bg, marginLeft: k ? -8 : 0 }}>
                <I size={16} />
              </span>
            ))}
          </span>
          <span className="flex-1 flex flex-col">
            <span className="text-[15px] font-extrabold">Badges</span>
            <span className="text-xs text-sc-ink3">See what you've unlocked</span>
          </span>
          <ChevronRight size={18} className="text-[#9AA19C]" />
        </button>
        {rows([
          { to: "/profile/my-matches", icon: Trophy, sport: "football", title: "My matches", sub: "Upcoming and past" },
          { to: "/profile/my-cycling", icon: Bike, sport: "cycling", title: "My cycling", sub: "Rides you joined and host" },
          { to: "/profile/wallet", icon: Wallet, sport: "money", title: "Wallet", sub: "Payments and cashouts" },
        ])}
        <span className="text-[13px] font-bold text-sc-ink3 uppercase tracking-[0.06em] px-1 pt-1">Venue manager</span>
        {rows([
          { to: "/profile/my-venue", icon: MapPin, sport: "venue", title: "My venues", sub: isVenueLinked ? "Dashboard, earnings and payouts" : "Link or list your venue" },
          ...(isVenueLinked
            ? [
                { to: "/profile/my-bookings", icon: Calendar, sport: "guide" as Sport, title: "Bookings", sub: "Calendar of bookings at your venue" },
                { to: "/profile/booking-code", icon: Key, sport: "pink" as Sport, title: "Booking codes", sub: "Give organisers a free slot" },
              ]
            : []),
        ])}
        <span className="text-[13px] font-bold text-sc-ink3 uppercase tracking-[0.06em] px-1 pt-1">Account</span>
        {rows([
          { to: "/profile/settings", icon: Settings, sport: "gray", title: "Settings", sub: "Location, app and notifications" },
          { to: "/profile/view-profile", icon: Trophy, sport: "guide", title: "Stats and performance" },
          { to: "/profile/account-details", icon: CircleUserRound, sport: "gray", title: "Account details" },
        ])}
        <span className="text-[13px] font-bold text-sc-ink3 uppercase tracking-[0.06em] px-1 pt-1">More</span>
        {rows([
          { to: "/guides", icon: BookOpen, sport: "guide", title: "Guides" },
          { href: "mailto:sportcliqapp@gmail.com", icon: Mail, sport: "gray", title: "Support" },
          { to: "/terms-privacy", icon: FileText, sport: "gray", title: "Terms and privacy" },
        ])}
        <button
          type="button"
          onClick={() => setConfirmOut(true)}
          className="h-[54px] rounded-full bg-sport-red-bg text-sport-red-fg font-bold flex items-center justify-center gap-2 mt-1"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </main>
      <Navbar />
      <ConfirmModal
        open={confirmOut}
        onOpenChange={setConfirmOut}
        icon={LogOut}
        tone="danger"
        title="Sign out of SportCliq?"
        description="You can sign back in any time with your email."
        confirmLabel="Sign out"
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default Profile;
