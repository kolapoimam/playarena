import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Users, MapPin, Star, Award, DollarSign, UserPlus, Map } from "lucide-react";
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

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
          <Trophy className="mr-2 h-6 w-6" />
          Your Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100 mb-2">Summary</h3>
            <p className="text-sm text-sc-ink3 dark:text-gray-400">
              You've earned {earnedBadgesCount} out of {totalBadgesCount} badges. Keep joining matches, organizing events, and listing venues to unlock more achievements!
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100 mb-4">Your Badges</h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((badge) => {
                  const isEarned = !!badge.earned_at;
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 ${getBadgeStyles(badge.name)} rounded-lg flex flex-col items-center gap-3 shadow-card ${
                        isEarned ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={isEarned ? () => setSelectedBadge(badge) : undefined}
                    >
                      {getBadgeIcon(badge.icon, isEarned)}
                      <p className="text-sm font-medium text-sc-ink2 dark:text-gray-300 text-center">{badge.name}</p>
                      <p className="text-xs text-sc-ink3 dark:text-gray-400">
                        {isEarned
                          ? `Earned: ${new Date(badge.earned_at!).toLocaleDateString()}`
                          : "Not yet earned"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-sc-ink3 dark:text-gray-400">
                No badges earned yet. Keep playing to unlock achievements!
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBadge && getBadgeIcon(selectedBadge.icon, true)}
              {selectedBadge?.name}
            </DialogTitle>
            <DialogDescription>{selectedBadge?.description}</DialogDescription>
          </DialogHeader>
          <div
            ref={badgeRef}
            className={`p-6 ${selectedBadge ? getBadgeStyles(selectedBadge.name) : ''} rounded-2xl flex flex-col items-center gap-3 border-4 w-[350px] h-[250px] relative shadow-lg`}
          >
            {selectedBadge && getBadgeIcon(selectedBadge.icon, true)}
            <p className="text-lg font-bold text-sc-ink dark:text-gray-100">{	selectedBadge?.name}</p>
            <p className="text-sm text-sc-ink2 dark:text-gray-300 text-center">{selectedBadge?.description}</p>
            <p className="text-xs text-sc-ink3 dark:text-gray-400">
              Earned: {selectedBadge?.earned_at ? new Date(selectedBadge.earned_at).toLocaleDateString() : "N/A"}
            </p>
            <img
              src={document.documentElement.classList.contains("dark") ? "/playarenadark.png" : "/playarenalight.png"}
              alt="PlayArena Logo"
              className="absolute bottom-2 w-20 h-20 object-contain"
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              className="bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
              onClick={() => selectedBadge && handleShareBadge(selectedBadge)}
            >
              Share to Socials
            </Button>
            <Button
              className="bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
              onClick={handleDownloadBadge}
            >
              Download Badge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Performance;
