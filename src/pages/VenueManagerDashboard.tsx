import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import VenueWallet from "@/components/VenueWallet";
import VenueAccessCode from "@/components/VenueAccessCode";

type Venue = { id: string; name: string; city: string; price_per_hour: number; is_verified: string };
type Booking = { id: string; title: string; match_date: string; start_time: string; end_time: string; organizer_name: string | null };

const VenueManagerDashboard = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalFunds, setTotalFunds] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [verifiedSince, setVerifiedSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        // Fetch upcoming bookings using new function
const { data: upcoming, error: upcomingError } = await supabase
  .rpc("get_bookings_by_venue_v3", {
    p_venue_id: venueId,
    p_is_upcoming: true,
    p_limit_count: 5,
  });

if (upcomingError) {
  console.error("Upcoming bookings error:", upcomingError);
  throw new Error(upcomingError.message);
}
const sortedUpcoming = (upcoming || []).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
setUpcomingBookings(sortedUpcoming);

const { data: past, error: pastError } = await supabase
  .rpc("get_bookings_by_venue_v3", {
    p_venue_id: venueId,
    p_is_upcoming: false,
    p_limit_count: 5,
  });

if (pastError) {
  console.error("Past bookings error:", pastError);
  throw new Error(pastError.message);
}
const sortedPast = (past || []).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
setPastBookings(sortedPast);

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

        // Fetch cashout requests to calculate available funds
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              className="text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Profile
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">Venue Manager</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 pb-24 space-y-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : !venue ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No venue data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalEvents}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Funds</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₦{totalFunds.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Verified Since</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {verifiedSince ? format(new Date(verifiedSince), "MMM d, yyyy") : "Not Verified"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <VenueWallet
              venueId={venueId!}
              availableFunds={availableFunds}
              setAvailableFunds={setAvailableFunds}
            />

            <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div key={booking.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{booking.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Duration: {differenceInHours(
                            new Date(`${booking.match_date}T${booking.end_time}`),
                            new Date(`${booking.match_date}T${booking.start_time}`)
                          )} hours
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Organizer: {booking.organizer_name || "Unknown"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming bookings.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Past Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {pastBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pastBookings.map((booking) => (
                      <div key={booking.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{booking.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Duration: {differenceInHours(
                            new Date(`${booking.match_date}T${booking.end_time}`),
                            new Date(`${booking.match_date}T${booking.start_time}`)
                          )} hours
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Organizer: {booking.organizer_name || "Unknown"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No past bookings.</p>
                )}
              </CardContent>
            </Card>

            <VenueAccessCode venueId={venueId!} />
          </>
        )}
      </main>
    </div>
  );
};

export default VenueManagerDashboard;
