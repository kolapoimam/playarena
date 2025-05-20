import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
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
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueName, setVenueName] = useState<string>("");

  useEffect(() => {
    const fetchVenueAndBookings = async () => {
      setLoading(true);
      try {
        // Fetch venue details to get venue_id and name
        const { data: venue, error: venueError } = await supabase
          .from("venues")
          .select("id, name, user_id")
          .eq("slug", venueSlug)
          .single();

        if (venueError || !venue) {
          throw new Error("Venue not found");
        }

        setVenueName(venue.name);

        // Verify user owns the venue
        const { data: user } = await supabase.auth.getUser();
        if (!user || user.user?.id !== venue.user_id) {
          throw new Error("Unauthorized access to venue bookings");
        }

        // Fetch bookings with match details
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
          throw new Error(bookingsError.message);
        }

        setBookings(bookingsData || []);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch bookings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVenueAndBookings();
  }, [venueSlug, toast]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold text-green-700 dark:text-green-400">
        Bookings for {venueName || venueSlug}
      </h1>
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
                  <TableRow>
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
                    <TableRow key={booking.id}>
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
    </div>
  );
};

export default VenueBookings;
