import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trophy, MapPin, Coins, Wallet, Volleyball, Medal } from "lucide-react";

type Analytics = {
  total_organized: number;
  total_joined: number;
  total_spent: number;
  total_cashout: number;
  total_venues: number;
};

type Profile = {
  id: string;
};

type UserDashboardProps = {
  profile: Profile | null;
};

const UserDashboard = ({ profile }: UserDashboardProps) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics>({
    total_organized: 0,
    total_joined: 0,
    total_spent: 0,
    total_cashout: 0,
    total_venues: 0,
  });
  const [analyticsFilter, setAnalyticsFilter] = useState<"all" | "this_month" | "last_month" | "this_week" | "last_week">("all");

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, analyticsFilter]);

  const fetchAnalytics = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const now = new Date();
    let transactionsQuery = supabase
      .from("user_transactions")
      .select("amount, transaction_type, created_at")
      .eq("user_id", session.session.user.id);
    let organizedQuery = supabase
      .from("user_organized_matches")
      .select("id", { count: "exact" })
      .eq("user_id", session.session.user.id);
    let joinedQuery = supabase
      .from("user_joined_matches")
      .select("id", { count: "exact" })
      .eq("user_id", session.session.user.id);
    let venuesQuery = supabase
      .from("venues")
      .select("id", { count: "exact" })
      .eq("user_id", session.session.user.id);

    if (analyticsFilter === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      transactionsQuery = transactionsQuery.gte("created_at", monthStart.toISOString());
      organizedQuery = organizedQuery.gte("created_at", monthStart.toISOString());
      joinedQuery = joinedQuery.gte("created_at", monthStart.toISOString());
      venuesQuery = venuesQuery.gte("created_at", monthStart.toISOString());
    } else if (analyticsFilter === "last_month") {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      transactionsQuery = transactionsQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      organizedQuery = organizedQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      joinedQuery = joinedQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      venuesQuery = venuesQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
    } else if (analyticsFilter === "this_week") {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      transactionsQuery = transactionsQuery.gte("created_at", weekStart.toISOString());
      organizedQuery = organizedQuery.gte("created_at", weekStart.toISOString());
      joinedQuery = joinedQuery.gte("created_at", weekStart.toISOString());
      venuesQuery = venuesQuery.gte("created_at", weekStart.toISOString());
    } else if (analyticsFilter === "last_week") {
      const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7));
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay() - 1));
      lastWeekEnd.setHours(23, 59, 59, 999);
      transactionsQuery = transactionsQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
      organizedQuery = organizedQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
      joinedQuery = joinedQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
      venuesQuery = venuesQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
    }

    const { data: transactions, error: transError } = await transactionsQuery;
    if (transError) {
      toast({ title: "Error", description: "Failed to load analytics.", variant: "destructive" });
      return;
    }

    const analyticsData: Analytics = {
      total_organized: (await organizedQuery).count || 0,
      total_joined: (await joinedQuery).count || 0,
      total_spent: transactions
        .filter((t) => t.transaction_type === "payment")
        .reduce((sum, t) => sum + t.amount, 0),
      total_cashout: transactions
        .filter((t) => t.transaction_type === "cashout")
        .reduce((sum, t) => sum + t.amount, 0),
      total_venues: (await venuesQuery).count || 0,
    };

    setAnalytics(analyticsData);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400">
          Your Stats
        </CardTitle>
        <Select
          value={analyticsFilter}
          onValueChange={(value) => setAnalyticsFilter(value as "all" | "this_month" | "last_month" | "this_week" | "last_week")}
          className="w-[180px]"
        >
          <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              All Time
            </SelectItem>
            <SelectItem value="this_month" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              This Month
            </SelectItem>
            <SelectItem value="last_month" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              Last Month
            </SelectItem>
            <SelectItem value="this_week" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              This Week
            </SelectItem>
            <SelectItem value="last_week" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              Last Week
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
            <Trophy className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Organized</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_organized}</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
            <Medal className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Joined</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_joined}</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
            <Coins className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spent</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_spent.toFixed(2)}</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
            <Wallet className="h-8 w-8 text-green-600" />
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
      </CardContent>
    </Card>
  );
};

export default UserDashboard;
