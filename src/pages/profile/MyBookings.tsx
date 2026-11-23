import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2, Repeat } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInHours } from "date-fns";
import Navbar from "@/components/Navbar";

import { BackButton } from "@/components/sc/ui";
import { EventListSkeleton } from "@/components/sc/skeletons";
import { FunEmpty } from "@/components/sc/ui";
import { CalendarCheck as CalendarCheckIcon } from "lucide-react";
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
  booker_name: string | null;
  booker_phone: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

type Organizer = {
  id: string;
  is_verified: boolean;
};

const MyBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userData.user) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }
        setUserId(userData.user.id);

        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id")
          .eq("user_id", userData.user.id)
          .single();

        if (venueError || !venueData) {
          toast({
            title: "No Venue Linked",
            description: "Please link a venue to view bookings.",
            variant: "destructive",
          });
          navigate("/profile/my-venue");
          return;
        }

        setVenueId(venueData.id);

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
            p_venue_id: venueData.id,
            p_is_upcoming: true,
            p_limit_count: 5,
          })
          .select(`
            id, venue_id, match_id, title, slug, match_date, start_time, end_time, 
            organizer_name, organizer_id, booker_name, booker_phone,
            matches:is_recurring, matches:recurring_frequency, matches:recurring_occurrences
          `);

        if (upcomingError) {
          console.error("Upcoming bookings error:", upcomingError);
          throw new Error(upcomingError.message);
        }

        // Fetch match details for upcoming bookings
        const upcomingWithMatchDetails = await Promise.all(
          (upcoming || []).map(async (booking: Booking) => {
            if (booking.match_id) {
              const { data: matchData, error: matchError } = await supabase
                .from("matches")
                .select("id, title, slug")
                .eq("id", booking.match_id)
                .single();
              if (matchError) {
                console.error("Match fetch error:", matchError);
                return booking;
              }
              return { 
                ...booking, 
                title: matchData?.title || booking.title, 
                slug: matchData?.slug || booking.slug,
                is_recurring: booking.matches?.is_recurring || false,
                recurring_frequency: booking.matches?.recurring_frequency || null,
                recurring_occurrences: booking.matches?.recurring_occurrences || null
              };
            }
            return {
              ...booking,
              is_recurring: booking.matches?.is_recurring || false,
              recurring_frequency: booking.matches?.recurring_frequency || null,
              recurring_occurrences: booking.matches?.recurring_occurrences || null
            };
          })
        );
        const sortedUpcoming = upcomingWithMatchDetails.sort(
          (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );
        setUpcomingBookings(sortedUpcoming);

        // Fetch past bookings with recurring details
        const { data: past, error: pastError } = await supabase
          .rpc("get_bookings_by_venue_v4", {
            p_venue_id: venueData.id,
            p_is_upcoming: false,
            p_limit_count: 5,
          })
          .select(`
            id, venue_id, match_id, title, slug, match_date, start_time, end_time, 
            organizer_name, organizer_id, booker_name, booker_phone,
            matches:is_recurring, matches:recurring_frequency, matches:recurring_occurrences
          `);

        if (pastError) {
          console.error("Past bookings error:", pastError);
          throw new Error(pastError.message);
        }

        // Fetch match details for past bookings
        const pastWithMatchDetails = await Promise.all(
          (past || []).map(async (booking: Booking) => {
            if (booking.match_id) {
              const { data: matchData, error: matchError } = await supabase
                .from("matches")
                .select("id, title, slug")
                .eq("id", booking.match_id)
                .single();
              if (matchError) {
                console.error("Match fetch error:", matchError);
                return booking;
              }
              return { 
                ...booking, 
                title: matchData?.title || booking.title, 
                slug: matchData?.slug || booking.slug,
                is_recurring: booking.matches?.is_recurring || false,
                recurring_frequency: booking.matches?.recurring_frequency || null,
                recurring_occurrences: booking.matches?.recurring_occurrences || null
              };
            }
            return {
              ...booking,
              is_recurring: booking.matches?.is_recurring || false,
              recurring_frequency: booking.matches?.recurring_frequency || null,
              recurring_occurrences: booking.matches?.recurring_occurrences || null
            };
          })
        );
        const sortedPast = pastWithMatchDetails.sort(
          (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        );
        setPastBookings(sortedPast);
      } catch (error: any) {
        console.error("Fetch bookings error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load bookings.",
          variant: "destructive",
        });
        navigate("/profile/my-venue");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton to="/profile" />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">My bookings</h1>
        </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
        {loading ? (
          <div className="w-full px-1"><EventListSkeleton /></div>
        ) : !venueId ? (
          <Card className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-sc-line dark:border-gray-700">
            <CardContent className="text-center py-6">
              <p className="text-sc-ink3 dark:text-gray-400">No linked venue found. Please link a venue.</p>
              <Button
                onClick={() => navigate("/profile/my-venue")}
                className="mt-4 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
              >
                Link Venue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-sc-line dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-sc-ink2 dark:text-gray-300">Venue Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-sc-soft2 dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Past
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">
                  {upcomingBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {upcomingBookings.map((booking) => {
                        const organizer = organizers.find(org => org.id === booking.organizer_id);
                        const isVerified = organizer?.is_verified || false;
                        return (
                          <Card key={booking.id} className="w-full p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card">
                            <h3 className="font-medium text-sc-ink dark:text-gray-100">{booking.title}</h3>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                              {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Duration: {differenceInHours(
                                new Date(`${booking.match_date}T${booking.end_time}`),
                                new Date(`${booking.match_date}T${booking.start_time}`)
                              )} hours
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                              Organizer: {booking.organizer_name}
                              {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                            </p>
                            {userId && booking.is_recurring && (
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Repeat className="w-4 h-4 mr-1" />
                                Repeats {booking.recurring_frequency} for {booking.recurring_occurrences} times
                              </p>
                            )}
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Booker Name: {booking.booker_name || "N/A"}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Phone Number: {booking.booker_phone || "N/A"}
                            </p>
                            <div className="mt-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                      onClick={() => {
                                        if (booking.slug) {
                                          navigate(`/match/${booking.slug}`);
                                        }
                                      }}
                                      disabled={!booking.slug}
                                    >
                                      View Details
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!booking.slug && (
                                  <TooltipContent>
                                    No match details available
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
<FunEmpty icon={CalendarCheckIcon} sport="venue" title="Nothing booked ahead" body="Upcoming venue bookings and their access codes will show here." />
                  )}
                </TabsContent>
                <TabsContent value="past">
                  {pastBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastBookings.map((booking) => {
                        const organizer = organizers.find(org => org.id === booking.organizer_id);
                        const isVerified = organizer?.is_verified || false;
                        return (
                          <Card key={booking.id} className="w-full p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card">
                            <h3 className="font-medium text-sc-ink dark:text-gray-100">{booking.title}</h3>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                              {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Duration: {differenceInHours(
                                new Date(`${booking.match_date}T${booking.end_time}`),
                                new Date(`${booking.match_date}T${booking.start_time}`)
                              )} hours
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                              Organizer: {booking.organizer_name}
                              {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                            </p>
                            {userId && booking.is_recurring && (
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Repeat className="w-4 h-4 mr-1" />
                                Repeats {booking.recurring_frequency} for {booking.recurring_occurrences} times
                              </p>
                            )}
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Booker Name: {booking.booker_name || "N/A"}
                            </p>
                            <p className="text-sm text-sc-ink3 dark:text-gray-400">
                              Phone Number: {booking.booker_phone || "N/A"}
                            </p>
                            <div className="mt-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                      onClick={() => {
                                        if (booking.slug) {
                                          navigate(`/match/${booking.slug}`);
                                        }
                                      }}
                                      disabled={!booking.slug}
                                    >
                                      View Details
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!booking.slug && (
                                  <TooltipContent>
                                    No match details available
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
<FunEmpty icon={CalendarCheckIcon} sport="gray" title="No past bookings" body="Your booking history builds up here over time." />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MyBookings;
