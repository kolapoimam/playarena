import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, MapPin } from "lucide-react";
import StatsPanel, { type StatsFilter } from "@/components/profile/StatsPanel";

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
  const [analyticsFilter, setAnalyticsFilter] = useState<StatsFilter>("all");

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
    <StatsPanel
      sport="football"
      filter={analyticsFilter}
      onFilter={setAnalyticsFilter}
      heroLabel="Matches"
      heroIcon={Trophy}
      organised={{ label: "Organised", value: analytics.total_organized }}
      joined={{ label: "Joined", value: analytics.total_joined }}
      spent={analytics.total_spent}
      cashout={analytics.total_cashout}
      extra={{ label: "Venues listed", value: analytics.total_venues, icon: MapPin, sport: "venue" }}
    />
  );
};

export default UserDashboard;
