import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Users, MapPin, Star, Award, DollarSign, UserPlus, Map, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCompact } from "@/components/sc/ui";
import html2canvas from "html2canvas";

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
};

type Profile = {
  id: string;
};

type PerformanceProps = {
  profile: Profile | null;
};

const Performance = ({ profile }: PerformanceProps) => {
  const { toast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchBadges();
    }
  }, [profile]);

  const fetchBadges = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    // Fetch all possible badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("id, name, description, icon");

    if (badgesError) {
      toast({ title: "Error", description: "Failed to load badges.", variant: "destructive" });
      return;
    }

    // Fetch earned badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select(`
        badge_id,
        badges(id, name, description, icon),
        earned_at
      `)
      .eq("user_id", session.session.user.id);

    if (userBadgesError) {
      toast({ title: "Error", description: "Failed to load earned badges.", variant: "destructive" });
      return;
    }

    const earnedBadgeIds = userBadges.map((ub) => ub.badge_id);
    const badgesData = allBadges.map((badge) => ({
      ...badge,
      earned_at: userBadges.find((ub) => ub.badge_id === badge.id)?.earned_at,
    }));

    setBadges(badgesData);
  };

  const getBadgeIcon = (icon: string, earned: boolean) => {
    const className = earned ? "h-8 w-8 text-yellow-500" : "h-8 w-8 text-gray-400";
    switch (icon) {
      case "UserPlus":
        return <UserPlus className={className} />;
      case "Users":
        return <Users className={className} />;
      case "MapPin":
        return <MapPin className={className} />;
      case "Star":
        return <Star className={className} />;
      case "Map":
        return <Map className={className} />;
      case "Award":
        return <Award className={className} />;
      case "DollarSign":
        return <DollarSign className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  const getBadgeStyles = (badgeName: string) => {
    switch (badgeName) {
      case "First Kickoff":
        return "bg-gradient-to-br from-blue-200 to-blue-400 dark:from-blue-700 dark:to-blue-900 border-blue-500";
      case "Match Maestro":
        return "bg-gradient-to-br from-green-200 to-green-400 dark:from-green-700 dark:to-green-900 border-sc-green";
      case "Venue Visionary":
        return "bg-gradient-to-br from-purple-200 to-purple-400 dark:from-purple-700 dark:to-purple-900 border-purple-500";
      case "Deca-Paid Star":
        return "bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-700 dark:to-yellow-900 border-yellow-500";
      case "Deca-Free Star":
        return "bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-700 dark:to-orange-900 border-orange-500";
      case "Penta-Venue Legend":
        return "bg-gradient-to-br from-red-200 to-red-400 dark:from-red-700 dark:to-red-900 border-red-500";
      case "Deca-Match Maestro":
        return "bg-gradient-to-br from-teal-200 to-teal-400 dark:from-teal-700 dark:to-teal-900 border-teal-500";
      case "Elite Investor":
        return "bg-gradient-to-br from-pink-200 to-pink-400 dark:from-pink-700 dark:to-pink-900 border-pink-500";
      default:
        return "bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-900 border-gray-500";
    }
  };

  const getShareText = (badge: Badge) => {
    switch (badge.name) {
      case "First Kickoff":
        return `I just earned a badge for First Kickoff: Scored my first match! 🏅 Join the action! #SportCliq Powered by @SportCliq`;
      case "Match Maestro":
        return `I just earned a badge for Match Maestro: Organized my first match! 🎯 Who's next? 🏅 #SportCliq Powered by @SportCliq`;
      case "Venue Visionary":
        return `I just earned a badge for Venue Visionary: Set the stage with my first venue! 📍 🏅 #SportCliq Powered by @SportCliq`;
      case "Deca-Paid Star":
        return `I just earned a badge for Deca-Paid Star: Conquered 10 paid matches! 🌟 🏅 #SportCliq Powered by @SportCliq`;
      case "Deca-Free Star":
        return `I just earned a badge for Deca-Free Star: Played 10 free matches! ⚽ 🏅 #SportCliq Powered by @SportCliq`;
      case "Penta-Venue Legend":
        return `I just earned a badge for Penta-Venue Legend: Listed 5 venues! 🗺️ 🏅 #SportCliq Powered by @SportCliq`;
      case "Deca-Match Maestro":
        return `I just earned a badge for Deca-Match Maestro: Mastered 10 matches! 🏆 🏅 #SportCliq Powered by @SportCliq`;
      case "Elite Investor":
        return `I just earned a badge for Elite Investor: Invested big in matches! 💰 🏅 #SportCliq Powered by @SportCliq`;
      default:
        return `I just earned a badge for ${badge.name}: ${badge.description} 🏅 #SportCliq Powered by @SportCliq`;
    }
  };

  const handleShareBadge = async (badge: Badge) => {
    const shareData = {
      title: `I earned the ${badge.name} badge!`,
      text: getShareText(badge),
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title} ${shareData.text} ${shareData.url}`);
        toast({ title: "Copied", description: "Badge share link copied to clipboard!" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to share badge.", variant: "destructive" });
    }
  };

  const handleDownloadBadge = async () => {
    if (badgeRef.current) {
      try {
        // Preload the logo image to ensure it renders in the canvas
        const logoSrc = document.documentElement.classList.contains("dark") ? "/playarenadark.png" : "/playarenalight.png";
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoSrc;
        });

        const canvas = await html2canvas(badgeRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: badgeRef.current.scrollWidth,
          windowHeight: badgeRef.current.scrollHeight,
        });
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${selectedBadge?.name.replace(/\s+/g, '-')}-badge.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Download error:", error);
        toast({ title: "Error", description: "Failed to download badge.", variant: "destructive" });
      }
    }
  };

  const earnedBadgesCount = badges.filter((badge) => badge.earned_at).length;
  const totalBadgesCount = badges.length;

  const pct = totalBadgesCount ? Math.round((earnedBadgesCount * 100) / totalBadgesCount) : 0;
  const nextUp = badges.find((b) => !b.earned_at);
  const ring = 2 * Math.PI * 34;
  const colors = ["#16A34A", "#2563EB", "#F97316", "#7C3AED", "#EC4899", "#14B8A6", "#EAB308", "#EF4444"];
  const sorted = [...badges].sort((x, y) => Number(!!y.earned_at) - Number(!!x.earned_at));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[28px] p-5 text-white flex items-center gap-4" style={{ background: "#0E1411" }}>
        <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0" aria-hidden="true">
          <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
          <circle cx="42" cy="42" r="34" fill="none" stroke="#BEF264" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(ring * pct) / 100} ${ring}`} transform="rotate(-90 42 42)" />
          <text x="42" y="47" textAnchor="middle" fill="#FFFFFF" fontSize="17" fontWeight="800">{pct}%</text>
        </svg>
        <div className="min-w-0">
          <span className="text-xs font-bold tracking-[0.12em] opacity-70">BADGES EARNED</span>
          <div className="text-[34px] leading-[40px] font-extrabold tracking-[-0.03em]">
            {formatCompact(earnedBadgesCount)}
            <span className="opacity-50"> / {formatCompact(totalBadgesCount)}</span>
          </div>
          <p className="m-0 text-[13px] opacity-80 leading-snug">
            {nextUp ? <>Next up, <b className="text-[#BEF264]">{nextUp.name}</b>. {nextUp.description}</> : "You have unlocked every badge. Legend."}
          </p>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="rounded-[24px] bg-white p-2 flex flex-col">
          {sorted.map((badge, i) => {
            const got = !!badge.earned_at;
            const c = colors[i % colors.length];
            return (
              <div key={badge.id} className="flex items-center gap-3 p-2.5">
                <span className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0" style={{ background: got ? c : "#EEF0EA", color: got ? "#FFFFFF" : "#9AA19C" }}>
                  {got ? <Award size={22} /> : <Lock size={20} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-extrabold truncate">{badge.name}</span>
                  <span className="block text-[13px] text-sc-ink3 truncate">{badge.description}</span>
                </span>
                <span className={`text-xs font-bold shrink-0 px-2.5 py-1 rounded-full ${got ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#EEF0EA] text-[#4A524D]"}`}>
                  {got ? new Date(badge.earned_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link to="/profile/badges" className="h-[52px] rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2">
        <Trophy size={18} /> See badges, save and share
      </Link>
    </div>
  );
};

export default Performance;
