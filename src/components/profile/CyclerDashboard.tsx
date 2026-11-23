import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bike, MapPin } from "lucide-react";
import StatsPanel, { type StatsFilter } from "@/components/profile/StatsPanel";

type Analytics = {
  total_organized: number;
  total_joined: number;
  total_spent: number;
  total_cashout: number;
  total_landmarks: number;
};

type Profile = {
  id: string;
};

type CyclerDashboardProps = {
  profile: Profile | null;
};

const CyclerDashboard = ({ profile }: CyclerDashboardProps) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics>({
    total_organized: 0,
    total_joined: 0,
    total_spent: 0,
    total_cashout: 0,
    total_landmarks: 0,
  });
  const [analyticsFilter, setAnalyticsFilter] = useState<StatsFilter>("all");

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, analyticsFilter]);

  const fetchAnalytics = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast({ title: "Error", description: "Please log in to view analytics.", variant: "destructive" });
      return;
    }

    const userId = session.session.user.id;
    const now = new Date();

    // Base queries
    let eventsQuery = supabase
      .from("cycling_events")
      .select("id_uuid, created_at, start_landmark_id", { count: "exact" })
      .eq("host_id", userId);

let attendeesQuery = supabase
  .from("user_joined_cycling")
  .select(`
    id,
    created_at,
    attendee_id,
    cycling_attendees(id_uuid, cycling_event_id_uuid, confirmation_code, status)
  `)
  .eq("user_id", userId);

    let cashoutsQuery = supabase
      .from("cycling_cashouts")
      .select("total_amount_paid, created_at")
      .eq("host_id", userId)
      .eq("status", "Successful");

    // Apply time filters
    if (analyticsFilter === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      eventsQuery = eventsQuery.gte("created_at", monthStart.toISOString());
      attendeesQuery = attendeesQuery.gte("created_at", monthStart.toISOString());
      cashoutsQuery = cashoutsQuery.gte("created_at", monthStart.toISOString());
    } else if (analyticsFilter === "last_month") {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      eventsQuery = eventsQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      attendeesQuery = attendeesQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      cashoutsQuery = cashoutsQuery
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
    } else if (analyticsFilter === "this_week") {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      eventsQuery = eventsQuery.gte("created_at", weekStart.toISOString());
      attendeesQuery = attendeesQuery.gte("created_at", weekStart.toISOString());
      cashoutsQuery = cashoutsQuery.gte("created_at", weekStart.toISOString());
    } else if (analyticsFilter === "last_week") {
      const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7));
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay() - 1));
      lastWeekEnd.setHours(23, 59, 59, 999);
      eventsQuery = eventsQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
      attendeesQuery = attendeesQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
      cashoutsQuery = cashoutsQuery
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());
    }

    try {
      // Fetch data
      const [
        { data: eventsData, count: eventsCount, error: eventsError },
        { data: joinedData, error: joinedError },
        { data: cashoutsData, error: cashoutsError },
      ] = await Promise.all([eventsQuery, attendeesQuery, cashoutsQuery]);

      if (eventsError || joinedError || cashoutsError) {
        console.error("Analytics fetch error:", {
          eventsError: eventsError?.message,
          joinedError: joinedError?.message,
          cashoutsError: cashoutsError?.message,
        });
        toast({ title: "Error", description: "Failed to load cycling analytics.", variant: "destructive" });
        return;
      }

      // Extract attendees data
const attendeesData = joinedData
  ?.map((item) => item.cycling_attendees)
  .filter((attendee) => attendee !== null) || [];

      // Calculate total spent by joining attendees with events
      let totalSpent = 0;
      if (attendeesData.length > 0) {
        const eventIds = attendeesData.map((a) => a.cycling_event_id_uuid);
        const { data: eventsForAttendees, error: eventsFetchError } = await supabase
          .from("cycling_events")
          .select("id_uuid, price, is_free")
          .in("id_uuid", eventIds);

        if (eventsFetchError) {
          console.error("Events fetch error:", eventsFetchError.message);
          toast({ title: "Error", description: "Failed to load event details.", variant: "destructive" });
          return;
        }

        totalSpent = attendeesData.reduce((sum, attendee) => {
          const event = eventsForAttendees?.find((e) => e.id_uuid === attendee.cycling_event_id_uuid);
          if (event && !event.is_free && event.price) {
            return sum + event.price; // Assume 1 slot per attendee
          }
          return sum;
        }, 0);
      }

      // Calculate analytics
      const analyticsData: Analytics = {
        total_organized: eventsCount || 0,
        total_joined: attendeesData.length,
        total_spent: totalSpent,
        total_cashout: cashoutsData?.reduce((sum, c) => sum + c.total_amount_paid, 0) || 0,
        total_landmarks: eventsData ? [...new Set(eventsData.map((e) => e.start_landmark_id))].length : 0,
      };

      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error("Analytics fetch error:", error.message, error);
      toast({ title: "Error", description: "Failed to load cycling analytics.", variant: "destructive" });
    }
  };

  return (
    <StatsPanel
      sport="cycling"
      filter={analyticsFilter}
      onFilter={setAnalyticsFilter}
      heroLabel="Rides"
      heroIcon={Bike}
      organised={{ label: "Hosted", value: analytics.total_organized }}
      joined={{ label: "Joined", value: analytics.total_joined }}
      spent={analytics.total_spent}
      cashout={analytics.total_cashout}
      extra={{ label: "Landmarks used", value: analytics.total_landmarks, icon: MapPin, sport: "pink" }}
    />
  );
};

export default CyclerDashboard;
