import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

type Booking = {
  id: string;
  venue_id: string;
  match_id: string;
  amount: number;
  payment_status: string;
  matches: {
    title: string;
    match_date: string;
    start_time: string;
    end_time: string;
  };
};

const VenueBookings = () => {
  const { venueSlug } = useParams<{ venueSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueName, setVenueName] = useState<string>("");

  useEffect(() => {
    const fetchVenueAndBookings = async () => {
      if (!venueSlug) {
        toast({ title: "Error", description: "Invalid venue slug.", variant: "destructive" });
        navigate("/profile");
        return;
      }

      setLoading(true);
      try {
        // Fetch user
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) {
          console.error("User auth error:", userError);
          throw new Error("User not authenticated");
        }

        // Fetch venue details
        const { data: venue, error: venueError } = await supabase
          .from("venues")
          .select("id, name, user_id")
          .eq("slug", venueSlug)
          .single();

        if (venueError || !venue) {
          console.error("Venue fetch error:", venueError);
          throw new Error("Venue not found");
        }

        if (venue.user_id !== user.user.id) {
          console.error("Unauthorized access:", { venueId: venue.id, userId: user.user.id });
          throw new Error("Unauthorized access to venue bookings");
        }

        setVenueName(venue.name);

        // Fetch bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            id,
            venue_id,
            match_id,
            amount,
            payment_status,
            matches (
              title,
              match_date,
              start_time,
              end_time
            )
          `)
          .eq("venue_id", venue.id)
          .order("created_at", { ascending: false });

        if (bookingsError) {
          console.error("Bookings fetch error:", bookingsError);
          throw new Error(bookingsError.message);
        }

        setBookings(bookingsData || []);
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch bookings.",
          variant: "destructive",
        });
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    fetchVenueAndBookings();
  }, [venueSlug, toast, navigate]);

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
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
              Bookings for {venueName || venueSlug}
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 pb-24 space-y-8">
        <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl overflow-hidden">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No bookings found for this venue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                      <TableHead className="text-gray-700 dark:text-gray-300">Booking ID</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Match Title</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Time</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Amount</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {booking.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {booking.matches.title}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {format(new Date(booking.matches.match_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {booking.matches.start_time} - {booking.matches.end_time}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          ₦{booking.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              booking.payment_status === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}
                          >
                            {booking.payment_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VenueBookings;
