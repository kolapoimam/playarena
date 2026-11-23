import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Users, Trophy, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import VenueWallet from "@/components/venueManagement/VenueWallet";
import VenueAccessCode from "@/components/venueManagement/VenueAccessCode";
import Navbar from "@/components/Navbar";
import ManagerBookingView from "@/components/venueManagement/ManagerBookingView";

type Venue = { id: string; name: string; city: string; price_per_hour: number; is_verified: string };
type Booking = { 
  id: string; 
  venue_id: string;
  match_id: string | null;
  title: string; 
  slug: string | null;
  match_date: string; 
  start_time: string; 
  end_time: string; 
  organizer_name: string;
  organizer_id: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

const VenueManagerDashboard = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [organizers, setOrganizers] = useState<{ id: string; is_verified: boolean }[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalFunds, setTotalFunds] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [verifiedSince, setVerifiedSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingsOpen, setIsBookingsOpen] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!venueId) {
        toast({ title: "Error", description: "Invalid venue ID.", variant: "destructive" });
        navigate("/profile");
        return;
      }

      setLoading(true);
      try {
        // Verify user
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) {
          throw new Error("User not authenticated");
        }
        setUserId(user.user.id);

        // Fetch venue details
        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id, name, city, price_per_hour, is_verified, user_id")
          .eq("id", venueId)
          .single();

        if (venueError || !venueData) {
          console.error("Venue fetch error:", venueError);
          throw new Error("Venue not found");
        }

        if (venueData.user_id !== user.user.id) {
          console.error("Unauthorized venue access:", { venueId, userId: user.user.id });
          throw new Error("Unauthorized access to this venue");
        }

        setVenue(venueData);

        // Fetch organizers for verified badge
        const { data: organizersData, error: organizersError } = await supabase
          .from("organizers")
          .select("id, is_verified");

        if (organizersError) {
          console.error("Organizers fetch error:", organizersError);
          throw new Error("Failed to fetch organizers");
        }
        setOrganizers(organizersData || []);

        // Fetch upcoming bookings with recurring details
        const { data: upcoming, error: upcomingError } = await supabase
          .rpc("get_bookings_by_venue_v4", {
            p_venue_id: venueId,
            p_is_upcoming: true,
            p_limit_count: 5,
          })
          .select(`
            id, venue_id, match_id, title, slug, match_date, start_time, end_time, organizer_name, organizer_id,
            matches:is_recurring, matches:recurring_frequency, matches:recurring_occurrences
          `);

        if (upcomingError) {
          console.error("Upcoming bookings error:", upcomingError);
          throw new Error(upcomingError.message);
        }
        const sortedUpcoming = (upcoming || []).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
        setUpcomingBookings(sortedUpcoming.map(booking => ({
          ...booking,
          is_recurring: booking.matches?.is_recurring || false,
          recurring_frequency: booking.matches?.recurring_frequency || null,
          recurring_occurrences: booking.matches?.recurring_occurrences || null,
        })));

        // Fetch past bookings with recurring details
        const { data: past, error: pastError } = await supabase
          .rpc("get_bookings_by_venue_v4", {
            p_venue_id: venueId,
            p_is_upcoming: false,
            p_limit_count: 5,
          })
          .select(`
            id, venue_id, match_id, title, slug, match_date, start_time, end_time, organizer_name, organizer_id,
            matches:is_recurring, matches:recurring_frequency, matches:recurring_occurrences
          `);

        if (pastError) {
          console.error("Past bookings error:", pastError);
          throw new Error(pastError.message);
        }
        const sortedPast = (past || []).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
        setPastBookings(sortedPast.map(booking => ({
          ...booking,
          is_recurring: booking.matches?.is_recurring || false,
          recurring_frequency: booking.matches?.recurring_frequency || null,
          recurring_occurrences: booking.matches?.recurring_occurrences || null,
        })));

        // Fetch total events
        const { count: eventCount, error: countError } = await supabase
          .from("bookings")
          .select("*", { count: "exact" })
          .eq("venue_id", venueId);

        if (countError) {
          console.error("Event count error:", countError);
          throw new Error(countError.message);
        }
        setTotalEvents(eventCount || 0);

        // Fetch total funds
        const { data: fundsData, error: fundsError } = await supabase
          .from("bookings")
          .select("amount")
          .eq("venue_id", venueId)
          .eq("payment_status", "paid");

        if (fundsError) {
          console.error("Funds error:", fundsError);
          throw new Error(fundsError.message);
        }
        const total = fundsData?.reduce((sum, booking) => sum + (booking.amount || 0), 0) || 0;
        setTotalFunds(total);

        // Fetch cashout requests
        const { data: cashoutData, error: cashoutError } = await supabase
          .from("venue_booking_cashout")
          .select("amount, status")
          .eq("venue_id", venueId)
          .in("status", ["Review", "Processed", "Successful"]);

        if (cashoutError) {
          console.error("Cashout fetch error:", cashoutError);
          throw new Error(cashoutError.message);
        }

        const cashoutTotal = cashoutData?.reduce((sum, request) => sum + (request.amount || 0), 0) || 0;
        setAvailableFunds(total - cashoutTotal);

        // Fetch verification date
        const { data: verifiedData, error: verifiedError } = await supabase
          .from("access_pins")
          .select("created_at")
          .eq("venue_id", venueId)
          .eq("verified", 'true')
          .limit(1)
          .single();

        if (verifiedError && verifiedError.code !== "PGRST116") {
          console.error("Verification error:", verifiedError);
          throw new Error(verifiedError.message);
        }
        setVerifiedSince(verifiedData?.created_at || null);
      } catch (error: any) {
        console.error("Fetch venue data error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load venue data.",
          variant: "destructive",
        });
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [venueId, toast, navigate]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-sc-bg dark:bg-gray-900 flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:text-gray-200 text-sm flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">Venue Manager</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        <main className="container mx-auto p-4 pb-24 space-y-8 flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-sc-green-dark" />
            </div>
          ) : !venue ? (
            <p className="text-center text-sc-ink3 dark:text-gray-400">No venue data available.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-sc-green-bg dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-card">
                  <Users className="h-8 w-8 text-sc-green-dark" />
                  <div>
                    <p className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Total Events</p>
                    <p className="text-lg font-semibold text-sc-ink dark:text-gray-100">{totalEvents}</p>
                  </div>
                </div>
                <div className="p-4 bg-sc-green-bg dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-card">
                  <Trophy className="h-8 w-8 text-sc-green-dark" />
                  <div>
                    <p className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Total Funds</p>
                    <p className="text-lg font-semibold text-sc-ink dark:text-gray-100">₦{totalFunds.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 bg-sc-green-bg dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-card">
                  <CheckCircle className="h-8 w-8 text-sc-green-dark" />
                  <div>
                    <p className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Verified Since</p>
                    <p className="text-lg font-semibold text-sc-ink dark:text-gray-100">
                      {verifiedSince ? format(new Date(verifiedSince), "MMM d, yyyy") : "Not Verified"}
                    </p>
                  </div>
                </div>
              </div>

              <VenueWallet
                venueId={venueId!}
                availableFunds={availableFunds}
                setAvailableFunds={setAvailableFunds}
              />

              <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
                <CardHeader>
                  <ManagerBookingView
                    upcomingBookings={upcomingBookings}
                    pastBookings={pastBookings}
                    organizers={organizers}
                    isBookingsOpen={isBookingsOpen}
                    setIsBookingsOpen={setIsBookingsOpen}
                    userId={userId}
                  />
                </CardHeader>
              </Card>

              <VenueAccessCode venueId={venueId!} />
            </>
          )}
        </main>

        <div className="sticky bottom-0 z-20">
          <Navbar />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VenueManagerDashboard;
