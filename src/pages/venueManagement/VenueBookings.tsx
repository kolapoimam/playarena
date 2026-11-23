import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, MapPin, Calendar, Clock, CreditCard } from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

import { BackButton } from "@/components/sc/ui";
type Booking = {
  id: string;
  venue_id: string;
  match_id: string | null;
  match_date: string;
  start_time: string;
  end_time: string;
  amount: number;
  payment_status: string;
  payment_reference: string | null;
  venue_name: string;
  match_title: string | null;
  booker_name: string | null;
  booker_phone: string | null;
};

const VenueBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id,
            venue_id,
            match_id,
            match_date,
            start_time,
            end_time,
            amount,
            payment_status,
            payment_reference,
            booker_name,
            booker_phone,
            venues!inner(name, user_id),
            matches!left(title)
          `)
          .eq("venues.user_id", userData.user.id)
          .order("match_date", { ascending: false });

        if (error) throw error;

        const transformedBookings: Booking[] = data.map((booking: any) => ({
          id: booking.id,
          venue_id: booking.venue_id,
          match_id: booking.match_id,
          match_date: booking.match_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          amount: booking.amount,
          payment_status: booking.payment_status,
          payment_reference: booking.payment_reference,
          venue_name: booking.venues.name,
          match_title: booking.matches?.title || null,
          booker_name: booking.booker_name,
          booker_phone: booking.booker_phone,
        }));

        setBookings(transformedBookings);
      } catch (error: any) {
        console.error("Error fetching bookings:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load bookings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [toast]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="min-h-screen bg-sc-bg dark:bg-gray-900 pb-20">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Bookings</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200 mb-4">
            Booking History
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-sc-green-dark" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sc-ink3 dark:text-gray-400 text-center">
              No bookings found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Venue</TableHead>
                    <TableHead className="text-left">Match</TableHead>
                    <TableHead className="text-left">Date</TableHead>
                    <TableHead className="text-left">Time</TableHead>
                    <TableHead className="text-left">Amount</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">Payment Ref</TableHead>
                    <TableHead className="text-left">Booker Name</TableHead>
                    <TableHead className="text-left">Phone Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.venue_name}
                      </TableCell>
                      <TableCell>
                        {booking.match_title || "No match linked"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-muted-foreground" />
                          {format(new Date(booking.match_date), "PPP")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2 text-muted-foreground" />
                          {formatTime(booking.start_time)} -{" "}
                          {formatTime(booking.end_time)}
                        </div>
                      </TableCell>
                      <TableCell>₦{booking.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            booking.payment_status === "completed"
                              ? "bg-sc-green-bg text-sc-green-dark dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          )}
                        >
                          {booking.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {booking.payment_reference || "N/A"}
                      </TableCell>
                      <TableCell>
                        {booking.booker_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {booking.booker_phone || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default VenueBookings;
