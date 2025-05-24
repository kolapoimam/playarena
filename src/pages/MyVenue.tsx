import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, MapPin, Loader2, Users, Trophy, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import VenueWallet from "@/components/VenueWallet";
import Navbar from "@/components/Navbar";

const pinSchema = z.object({
  access_code: z
    .string()
    .length(6, "Access code must be 6 characters")
    .regex(/^[a-zA-Z0-9]{6}$/, "Access code must be 6 characters and contain only letters and numbers"),
});

type PinFormData = z.infer<typeof pinSchema>;

type Venue = {
  id: string;
  name: string;
  slug: string;
  pin: string;
  verified: boolean;
};

type VenueStats = {
  id: string;
  name: string;
  city: string;
  price_per_hour: number;
  is_verified: string;
};

const MyVenue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<VenueStats | null>(null);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalFunds, setTotalFunds] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [verifiedSince, setVerifiedSince] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const form = useForm<PinFormData>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      access_code: "",
    },
  });

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id")
          .eq("manager_id", userData.user.id)
          .single();

        if (venueData) {
          setIsVenueLinked(true);
          setVenueId(venueData.id);
        }

        const { data, error } = await supabase
          .from("access_pins")
          .select(`
            venue_id,
            pin,
            verified,
            user_id,
            venues (
              id,
              name,
              slug
            )
          `)
          .eq("user_id", userData.user.id);

        if (error) {
          console.error("Error fetching venues:", error);
          toast({ title: "Error", description: "Failed to fetch linked venues.", variant: "destructive" });
          return;
        }

        setVenues(
          data.map((item) => ({
            id: item.venues.id,
            name: item.venues.name,
            slug: item.venues.slug,
            pin: item.pin,
            verified: item.verified === 'true',
          }))
        );
      } catch (err) {
        console.error("Error fetching venues:", err);
        toast({
          title: "Error",
          description: "Failed to check venue status",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, [navigate, toast]);

  const fetchVenueStats = async (venueId: string) => {
    setStatsLoading(true);
    try {
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("id, name, city, price_per_hour, is_verified, manager_id")
        .eq("id", venueId)
        .single();

      if (venueError || !venueData) {
        throw new Error("Venue not found");
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || venueData.manager_id !== userData.user.id) {
        throw new Error("Unauthorized access to this venue");
      }

      setVenueStats(venueData);

      const { count: eventCount, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .eq("venue_id", venueId);

      if (countError) {
        throw new Error(countError.message);
      }
      setTotalEvents(eventCount || 0);

      const { data: fundsData, error: fundsError } = await supabase
        .from("bookings")
        .select("amount")
        .eq("venue_id", venueId)
        .eq("payment_status", "paid");

      if (fundsError) {
        throw new Error(fundsError.message);
      }
      const total = fundsData?.reduce((sum, booking) => sum + (booking.amount || 0), 0) || 0;
      setTotalFunds(total);

      const { data: cashoutData, error: cashoutError } = await supabase
        .from("venue_booking_cashout")
        .select("amount, status")
        .eq("venue_id", venueId)
        .in("status", ["Review", "Processed", "Successful"]);

      if (cashoutError) {
        throw new Error(cashoutError.message);
      }

      const cashoutTotal = cashoutData?.reduce((sum, request) => sum + (request.amount || 0), 0) || 0;
      setAvailableFunds(total - cashoutTotal);

      const { data: verifiedData, error: verifiedError } = await supabase
        .from("access_pins")
        .select("created_at")
        .eq("venue_id", venueId)
        .eq("verified", 'true')
        .limit(1)
        .single();

      if (verifiedError && verifiedError.code !== "PGRST116") {
        throw new Error(verifiedError.message);
      }
      setVerifiedSince(verifiedData?.created_at || null);
    } catch (error: any) {
      console.error("Fetch venue stats error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load venue data.",
        variant: "destructive",
      });
      navigate("/profile");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLinkVenue = async (data: PinFormData) => {
    setOperationLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const { data: pinData, error: pinError } = await supabase
        .from("access_pins")
        .select("venue_id, pin, verified, user_id")
        .eq("pin", data.access_code)
        .single();

      if (pinError || !pinData) {
        throw new Error("Invalid access code");
      }

      if (pinData.verified === 'true' || pinData.user_id) {
        throw new Error("Venue already linked to another user");
      }

      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("id, name, slug")
        .eq("id", pinData.venue_id)
        .single();

      if (venueError || !venueData) {
        throw new Error("Venue not found");
      }

      const { error: updateError } = await supabase
        .from("venues")
        .update({ manager_id: userData.user.id, updated_at: new Date().toISOString() })
        .eq("id", venueData.id);

      if (updateError) {
        throw new Error("Failed to link venue");
      }

      const { error: updatePinError } = await supabase
        .from("access_pins")
        .update({ user_id: userData.user.id, verified: 'true', updated_at: new Date().toISOString() })
        .eq("pin", data.access_code);

      if (updatePinError) {
        throw new Error("Failed to verify pin");
      }

      const newVenue = {
        id: venueData.id,
        name: venueData.name,
        slug: venueData.slug,
        pin: data.access_code,
        verified: true,
      };

      setVenues([...venues, newVenue]);
      setIsVenueLinked(true);
      setVenueId(venueData.id);
      setShowLinkDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Venue successfully linked!",
      });

      await fetchVenueStats(venueData.id);
    } catch (err: any) {
      console.error("Error linking venue:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to link venue",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleManageVenue = (venueId: string) => {
    fetchVenueStats(venueId);
    setShowLinkDialog(false);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              className="text-white hover:bg-green-600"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold">My Venue</h1>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : isVenueLinked && venueId ? (
              statsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div>
              ) : !venueStats ? (
                <p className="text-center text-gray-600 dark:text-gray-400">No venue data available.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                      <Users className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Events</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{totalEvents}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                      <Trophy className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Funds</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{totalFunds.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Verified Since</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {verifiedSince ? format(new Date(verifiedSince), "MMM d, yyyy") : "Not Verified"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <VenueWallet
                    venueId={venueId}
                    availableFunds={availableFunds}
                    setAvailableFunds={setAvailableFunds}
                  />
                </div>
              )
            ) : null}
          </div>
        </div>

        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
                <MapPin size={20} className="mr-2" />
                Manage Venues
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Enter a 6-character access code to link a venue to your profile, or manage existing linked venues.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLinkVenue)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="access_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">Access Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={6}
                            className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                            placeholder="Enter 6-character code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                    disabled={operationLoading}
                  >
                    {operationLoading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Submit Code"
                    )}
                  </Button>
                </form>
              </Form>
              {venues.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Linked Venues</h3>
                  {venues.map((venue) => (
                    <div key={venue.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{venue.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Code: {venue.pin}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageVenue(venue.id)}
                          className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white"
                          disabled={operationLoading}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false);
                  navigate("/profile");
                }}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                disabled={operationLoading}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="pb-28">
          <Navbar />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MyVenue;
