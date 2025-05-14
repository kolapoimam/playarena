import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Users, MapPin, Star, Award, DollarSign, UserPlus, Map } from "lucide-react";
import html2canvas from "html2canvas";

type Analytics = {
  total_organized: number;
  total_joined: number;
  total_spent: number;
  total_cashout: number;
  total_venues: number;
};

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
  const [analytics, setAnalytics] = useState<Analytics>({
    total_organized: 0,
    total_joined: 0,
    total_spent: 0,
    total_cashout: 0,
    total_venues: 0,
  });
  const [analyticsFilter, setAnalyticsFilter] = useState<"all" | "month" | "week">("all");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
      fetchBadges();
    }
  }, [profile, analyticsFilter]);

  const fetchAnalytics = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    let query = supabase
      .from("user_transactions")
      .select("amount, transaction_type, created_at")
      .eq("user_id", session.session.user.id);

    if (analyticsFilter === "month") {
      query = query.gte(
        "created_at",
        new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
      );
    } else if (analyticsFilter === "week") {
      query = query.gte(
        "created_at",
        new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()
      );
    }

    const { data: transactions, error: transError } = await query;

    if (transError) {
      toast({ title: "Error", description: "Failed to load analytics.", variant: "destructive" });
      return;
    }

    const analyticsData: Analytics = {
      total_organized: await supabase
        .from("user_organized_matches")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .then(({ count }) => count || 0),
      total_joined: await supabase
        .from("user_joined_matches")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .then(({ count }) => count || 0),
      total_spent: transactions
        .filter((t) => t.transaction_type === "payment")
        .reduce((sum, t) => sum + t.amount, 0),
      total_cashout: transactions
        .filter((t) => t.transaction_type === "cashout")
        .reduce((sum, t) => sum + t.amount, 0),
      total_venues: await supabase
        .from("venues")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .then(({ count }) => count || 0),
    };

    setAnalytics(analyticsData);
  };

  const fetchBadges = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        badge_id,
        badges(id, name, description, icon),
        earned_at
      `)
      .eq("user_id", session.session.user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to load badges.", variant: "destructive" });
      return;
    }

    setBadges(
      data.map((item) => ({
        id: item.badge_id,
        ...item.badges,
        earned_at: item.earned_at,
      }))
    );
  };

  const getBadgeIcon = (icon: string) => {
    switch (icon) {
      case "UserPlus":
        return <UserPlus className="h-8 w-8 text-yellow-500" />;
      case "Users":
        return <Users className="h-8 w-8 text-yellow-500" />;
      case "MapPin":
        return <MapPin className="h-8 w-8 text-yellow-500" />;
      case "Star":
        return <Star className="h-8 w-8 text-yellow-500" />;
      case "Map":
        return <Map className="h-8 w-8 text-yellow-500" />;
      case "Award":
        return <Award className="h-8 w-8 text-yellow-500" />;
      case "DollarSign":
        return <DollarSign className="h-8 w-8 text-yellow-500" />;
      default:
        return <Trophy className="h-8 w-8 text-yellow-500" />;
    }
  };

  const handleShareBadge = async (badge: Badge) => {
    const shareData = {
      title: `I earned the ${badge.name} badge!`,
      text: badge.description,
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
        const canvas = await html2canvas(badgeRef.current);
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
          Performance
        </CardTitle>
        <Select
          value={analyticsFilter}
          onValueChange={(value) => setAnalyticsFilter(value as "all" | "month" | "week")}
          className="w-[180px]"
        >
          <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              All Time
            </SelectItem>
            <SelectItem value="month" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              This Month
            </SelectItem>
            <SelectItem value="week" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              This Week
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Organized</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_organized}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Joined</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_joined}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
              <Trophy className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spent</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_spent.toFixed(2)}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
              <Trophy className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cashout</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_cashout.toFixed(2)}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
              <MapPin className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Venues Listed</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_venues}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Badges</h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg flex flex-col items-center gap-3 shadow-md cursor-pointer"
                    onClick={() => setSelectedBadge(badge)}
                  >
                    {getBadgeIcon(badge.icon)}
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{badge.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Earned: {new Date(badge.earned_at!).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No badges earned yet. Keep playing to unlock achievements!
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBadge && getBadgeIcon(selectedBadge.icon)}
              {selectedBadge?.name}
            </DialogTitle>
            <DialogDescription>{selectedBadge?.description}</DialogDescription>
          </DialogHeader>
          <div ref={badgeRef} className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg flex flex-col items-center gap-3">
            {selectedBadge && getBadgeIcon(selectedBadge.icon)}
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedBadge?.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedBadge?.description}</p>
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
