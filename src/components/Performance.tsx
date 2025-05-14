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

  const getShareText = (badge: Badge) => {
    switch (badge.name) {
      case "First Kickoff":
        return "I just joined my first match and earned the First Kickoff badge! Ready to score some goals! 🏅⚽";
      case "Match Maestro":
        return "I organized my first match and earned the Match Maestro badge! Leading the game! 🏅👥";
      case "Venue Visionary":
        return "I listed my first venue and earned the Venue Visionary badge! Building the community! 🏅📍";
      case "Deca-Paid Star":
        return "I joined 10 paid matches and earned the Deca-Paid Star badge! A true competitor! 🏅⭐";
      case "Deca-Free Star":
        return "I joined 10 free matches and earned the Deca-Free Star badge! Passion for the game! 🏅⭐";
      case "Penta-Venue Legend":
        return "I listed 5 venues and earned the Penta-Venue Legend badge! Shaping the pitch! 🏅🗺️";
      case "Deca-Match Maestro":
        return "I organized 10 matches and earned the Deca-Match Maestro badge! Master of the game! 🏅🏆";
      case "Elite Investor":
        return "I spent over ₦20,000 on matches and earned the Elite Investor badge! Big player! 🏅💰";
      default:
        return `I earned the ${badge.name} badge! ${badge.description}`;
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
        const canvas = await html2canvas(badgeRef.current, { scale: 2 });
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${selectedBadge?.name}-badge.png`;
        link.click();
      } catch (error) {
        toast({ title: "Error", description: "Failed to download badge.", variant: "destructive" });
      }
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
          <Trophy className="mr-2 h-6 w-6" />
          Your Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Badges</h3>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge) => {
                const isEarned = !!badge.earned_at;
                return (
                  <div
                    key={badge.id}
                    className={`p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg flex flex-col items-center gap-3 shadow-md ${
                      isEarned ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={isEarned ? () => setSelectedBadge(badge) : undefined}
                  >
                    {getBadgeIcon(badge.icon, isEarned)}
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{badge.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {isEarned
                        ? `Earned: ${new Date(badge.earned_at!).toLocaleDateString()}`
                        : "Not yet earned"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No badges earned yet. Keep playing to unlock achievements!
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBadge && getBadgeIcon(selectedBadge.icon, true)}
              {selectedBadge?.name}
            </DialogTitle>
            <DialogDescription>{selectedBadge?.description}</DialogDescription>
          </DialogHeader>
          <div
            ref={badgeRef}
            className="p-6 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-lg flex flex-col items-center gap-3 border-4 border-yellow-500"
          >
            {selectedBadge && getBadgeIcon(selectedBadge.icon, true)}
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedBadge?.name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{selectedBadge?.description}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Earned: {selectedBadge?.earned_at ? new Date(selectedBadge.earned_at).toLocaleDateString() : "N/A"}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => selectedBadge && handleShareBadge(selectedBadge)}
            >
              Share to Socials
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
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
