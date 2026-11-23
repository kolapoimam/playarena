import { Bubble, Cover, FunEmpty } from "@/components/sc/ui";
import { Store } from "lucide-react";
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

import { BackButton } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
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
          .select("id, name, city, price_per_hour, is_verified, user_id, image_urls")
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
        <header className="sticky top-0 z-30 bg-sc-bg/95 backdrop-blur-xl px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton to="/profile" />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Venue manager</h1>
            <div className="min-w-11" />
          </div>
        </header>

        <main className="px-5 pt-2 pb-28 flex flex-col gap-3.5 flex-1">
          {loading ? (
            <div className="w-full"><RowsSkeleton /></div>
          ) : !venue ? (
            <FunEmpty icon={Store} sport="venue" title="No venue here yet" body="Link your venue with its access code or list a new one to manage bookings." primary={{ label: "List a venue", onClick: () => navigate("/venue-create") }} />
          ) : (
            <>
              <div className="relative h-[170px] rounded-[28px] overflow-hidden">
                <Cover src={(venue as any).image_urls?.[0]} kind="venue" alt={(venue as any).name || "Venue"} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute left-5 right-5 bottom-4 text-white flex items-end justify-between gap-3">
                  <span className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-[0.12em] opacity-80">YOUR VENUE</span>
                    <span className="text-[24px] leading-7 font-extrabold tracking-[-0.02em] truncate">{(venue as any).name}</span>
                  </span>
                  {verifiedSince && <span className="h-8 px-3 rounded-full bg-white text-sc-ink text-xs font-extrabold inline-flex items-center gap-1 shrink-0"><CheckCircle size={14} className="text-sc-green" /> Verified</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: Users, sport: "venue" as const, label: "Events", value: String(totalEvents) },
                  { icon: Trophy, sport: "money" as const, label: "Earned", value: `₦${Math.round(totalFunds).toLocaleString()}` },
                  { icon: CheckCircle, sport: "football" as const, label: "Verified", value: verifiedSince ? format(new Date(verifiedSince), "MMM yyyy") : "Not yet" },
                ].map((f) => (
                  <div key={f.label} className="min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-1.5">
                    <Bubble icon={f.icon} sport={f.sport} size={32} />
                    <span className="text-xs text-sc-ink3 font-semibold">{f.label}</span>
                    <span className="text-[15px] font-extrabold truncate">{f.value}</span>
                  </div>
                ))}
              </div>

              <VenueWallet
                venueId={venueId!}
                availableFunds={availableFunds}
                setAvailableFunds={setAvailableFunds}
              />

              <div className="bg-white rounded-3xl p-[18px]">
                <div>
                  <ManagerBookingView
                    upcomingBookings={upcomingBookings}
                    pastBookings={pastBookings}
                    organizers={organizers}
                    isBookingsOpen={isBookingsOpen}
                    setIsBookingsOpen={setIsBookingsOpen}
                    userId={userId}
                  />
                </div>
              </div>

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
