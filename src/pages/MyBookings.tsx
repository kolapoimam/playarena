import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInHours } from "date-fns";
import Navbar from "@/components/Navbar";

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

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

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

        // Fetch upcoming bookings
        const { data: upcoming, error: upcomingError } = await supabase
          .rpc("get_bookings_by_venue_v4", {
            p_venue_id: venueData.id,
            p_is_upcoming: true,
            p_limit_count: 5,
          });

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
              return { ...booking, title: matchData?.title || booking.title, slug: matchData?.slug || booking.slug };
            }
            return booking;
          })
        );
        const sortedUpcoming = upcomingWithMatchDetails.sort(
          (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );
        setUpcomingBookings(sortedUpcoming);

        // Fetch past bookings
        const { data: past, error: pastError } = await supabase
          .rpc("get_bookings_by_venue_v4", {
            p_venue_id: venueData.id,
            p_is_upcoming: false,
            p_limit_count: 5,
          });

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
              return { ...booking, title: matchData?.title || booking.title, slug: matchData?.slug || booking.slug };
            }
            return booking;
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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : !venueId ? (
          <Card className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400">No linked venue found. Please link a venue.</p>
              <Button
                onClick={() => navigate("/profile/my-venue")}
                className="mt-4 bg-green-500 hover:bg-green-600 text-white"
              >
                Link Venue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300">Venue Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
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
                          <Card key={booking.id} className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{booking.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                              {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Duration: {differenceInHours(
                                new Date(`${booking.match_date}T${booking.end_time}`),
                                new Date(`${booking.match_date}T${booking.start_time}`)
                              )} hours
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              Organizer: {booking.organizer_name}
                              {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                            </p>
                            <div className="mt-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">No upcoming bookings found.</p>
                  )}
                </TabsContent>
                <TabsContent value="past">
                  {pastBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastBookings.map((booking) => {
                        const organizer = organizers.find(org => org.id === booking.organizer_id);
                        const isVerified = organizer?.is_verified || false;
                        return (
                          <Card key={booking.id} className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{booking.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                              {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Duration: {differenceInHours(
                                new Date(`${booking.match_date}T${booking.end_time}`),
                                new Date(`${booking.match_date}T${booking.start_time}`)
                              )} hours
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              Organizer: {booking.organizer_name}
                              {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                            </p>
                            <div className="mt-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">No past bookings found.</p>
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
