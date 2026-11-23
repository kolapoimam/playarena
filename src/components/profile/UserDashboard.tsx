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
    <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400">
          Matches Stats
        </CardTitle>
        <Select
          value={analyticsFilter}
          onValueChange={(value) => setAnalyticsFilter(value as "all" | "this_month" | "last_month" | "this_week" | "last_week")}
          className="w-[180px]"
        >
          <SelectTrigger className="bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100">
              All Time
            </SelectItem>
            <SelectItem value="this_month" className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100">
              This Month
            </SelectItem>
            <SelectItem value="last_month" className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100">
              Last Month
            </SelectItem>
            <SelectItem value="this_week" className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100">
              This Week
            </SelectItem>
            <SelectItem value="last_week" className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100">
              Last Week
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-sc-bg rounded-[22px] p-4 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#DCFCE7", color: "#15803D" }}><Trophy size={20} /></span>
            <span className="text-xs font-semibold text-sc-ink3">Matches Organized</span>
            <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">{analytics.total_organized}</span>
          </div>
          <div className="bg-sc-bg rounded-[22px] p-4 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#DBEAFE", color: "#1D4ED8" }}><Medal size={20} /></span>
            <span className="text-xs font-semibold text-sc-ink3">Matches Joined</span>
            <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">{analytics.total_joined}</span>
          </div>
          <div className="bg-sc-bg rounded-[22px] p-4 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#FFEDD5", color: "#C2410C" }}><Coins size={20} /></span>
            <span className="text-xs font-semibold text-sc-ink3">Total Spent</span>
            <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">₦{analytics.total_spent.toFixed(2)}</span>
          </div>
          <div className="bg-sc-bg rounded-[22px] p-4 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#EDE9FE", color: "#6D28D9" }}><Wallet size={20} /></span>
            <span className="text-xs font-semibold text-sc-ink3">Total Cashout</span>
            <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">₦{analytics.total_cashout.toFixed(2)}</span>
          </div>
          <div className="bg-sc-bg rounded-[22px] p-4 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#FCE7F3", color: "#BE185D" }}><MapPin size={20} /></span>
            <span className="text-xs font-semibold text-sc-ink3">Venues Listed</span>
            <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">{analytics.total_venues}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDashboard;
