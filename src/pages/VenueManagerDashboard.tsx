import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft } from "lucide-react";
import { format, differenceInHours } from "date-fns";

type Venue = { id: string; name: string; city: string; price_per_hour: number; is_verified: string };
type Booking = { id: string; title: string; match_date: string; start_time: string; end_time: string; organizer_name: string | null };
type AccessCode = { code: string; match_date: string; start_time: string; end_time: string; amount: number };

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
  const [showCashoutDialog, setShowCashoutDialog] = useState(false);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [cashoutDetails, setCashoutDetails] = useState({ bank_name: "", account_number: "", account_holder_name: "" });
  const [accessCodeForm, setAccessCodeForm] = useState({ match_date: "", start_time: "", end_time: "" });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
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

        // Fetch upcoming bookings
        const { data: upcoming, error: upcomingError } = await supabase
          .rpc("get_bookings_by_venue", {
            venue_id: venueId,
            is_upcoming: true,
            limit_count: 5,
          });

        if (upcomingError) {
          console.error("Upcoming bookings error:", upcomingError);
          throw new Error(upcomingError.message);
        }
        setUpcomingBookings(upcoming || []);

        // Fetch past bookings
        const { data: past, error: pastError } = await supabase
          .rpc("get_bookings_by_venue", {
            venue_id: venueId,
            is_upcoming: false,
            limit_count: 5,
          });

        if (pastError) {
          console.error("Past bookings error:", pastError);
          throw new Error(pastError.message);
        }
        setPastBookings(past || []);

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
        setAvailableFunds(total);

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

  const handleCashout = async () => {
    if (!cashoutDetails.bank_name || !cashoutDetails.account_number || !cashoutDetails.account_holder_name) {
      toast({ title: "Error", description: "Please fill in all bank details.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("venue_booking_cashout").insert({
        venue_id: venueId,
        amount: availableFunds,
        bank_name: cashoutDetails.bank_name,
        account_number: cashoutDetails.account_number,
        account_holder_name: cashoutDetails.account_holder_name,
        status: "pending",
      });
      if (error) {
        console.error("Cashout error:", error);
        throw error;
      }
      toast({ title: "Success", description: "Cashout request submitted successfully." });
      setShowCashoutDialog(false);
      setAvailableFunds(0);
      setCashoutDetails({ bank_name: "", account_number: "", account_holder_name: "" });
    } catch (error: any) {
      console.error("Cashout error:", error);
      toast({ title: "Error", description: error.message || "Failed to submit cashout request.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAccessCode = async () => {
    const { match_date, start_time, end_time } = accessCodeForm;
    if (!match_date || !start_time || !end_time) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        throw new Error("User not authenticated");
      }

      const code = Math.random().toString(36).slice(-6).toUpperCase();
      const { error } = await supabase.from("venue_access_codes").insert({
        code,
        venue_id: venueId,
        match_date,
        start_time,
        end_time,
        amount: 0.00,
        created_by: user.user.id,
      });
      if (error) {
        console.error("Access code error:", error);
        throw error;
      }
      setGeneratedCode(code);
      toast({ title: "Success", description: `Access code ${code} generated successfully.` });
    } catch (error: any) {
      console.error("Access code error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate access code.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">Venue Management Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{venue?.name}, {venue?.city}</p>
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
                <CardHdr>
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

            <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  Wallet
                  <Button
                    onClick={() => setShowCashoutDialog(true)}
                    disabled={availableFunds === 0 || loading}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    Cashout ₦{availableFunds.toFixed(2)}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Funds: ₦{availableFunds.toFixed(2)}</p>
              </CardContent>
            </Card>

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

            <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  Generate Access Code
                  <Button
                    onClick={() => setShowAccessCodeDialog(true)}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                    disabled={loading}
                  >
                    Generate Code
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate a free access code for organizers to book this venue.
                </p>
              </CardContent>
            </Card>

            <Dialog open={showCashoutDialog} onOpenChange={setShowCashoutDialog}>
              <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cashout Funds</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Enter your bank details to request a cashout of ₦{availableFunds.toFixed(2)}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-4">
                  <Input
                    placeholder="Bank Name"
                    value={cashoutDetails.bank_name}
                    onChange={(e) => setCashoutDetails({ ...cashoutDetails, bank_name: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <Input
                    placeholder="Account Number"
                    value={cashoutDetails.account_number}
                    onChange={(e) => setCashoutDetails({ ...cashoutDetails, account_number: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <Input
                    placeholder="Account Holder Name"
                    value={cashoutDetails.account_holder_name}
                    onChange={(e) => setCashoutDetails({ ...cashoutDetails, account_holder_name: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowCashoutDialog(false)}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCashout}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Cashout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
              <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Access Code</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Enter the date and time range for the free booking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-4">
                  <Input
                    type="date"
                    value={accessCodeForm.match_date}
                    onChange={(e) => setAccessCodeForm({ ...accessCodeForm, match_date: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <Input
                    type="time"
                    value={accessCodeForm.start_time}
                    onChange={(e) => setAccessCodeForm({ ...accessCodeForm, start_time: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <Input
                    type="time"
                    value={accessCodeForm.end_time}
                    onChange={(e) => setAccessCodeForm({ ...accessCodeForm, end_time: e.target.value })}
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  {generatedCode && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Generated Code: <span className="text-green-500">{generatedCode}</span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Share this code with an organizer to book the venue for free.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAccessCodeDialog(false);
                      setGeneratedCode(null);
                      setAccessCodeForm({ match_date: "", start_time: "", end_time: "" });
                    }}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Close
                  </Button>
                  {!generatedCode && (
                    <Button
                      onClick={handleGenerateAccessCode}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate"}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

export default VenueManagerDashboard;
