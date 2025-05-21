import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Clock } from "lucide-react";
import { PaystackButton } from "react-paystack";
import Navbar from "@/components/Navbar";

type Venue = {
  id: string;
  slug: string;
  name: string;
  booking_fee: number;
  verified_status: 'True' | 'False';
};

const bookingSchema = z.object({
  match_date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date",
  }),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid start time in HH:MM format (24-hour clock)",
  }),
  duration: z.number().min(1, { message: "Duration must be at least 1 hour" }).max(12, { message: "Duration cannot exceed 12 hours" }),
}).refine(
  (data) => {
    const now = new Date();
    const selectedDateTime = new Date(data.match_date);
    const [hours, minutes] = data.start_time.split(":").map(Number);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    return selectedDateTime >= tenMinutesLater;
  },
  { message: "Booking must be scheduled at least 10 minutes from now", path: ["start_time"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;

const VenueBookingForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      match_date: undefined,
      start_time: "",
      duration: 1,
    },
  });

  useEffect(() => {
    const fetchVenueAndUser = async () => {
      if (!slug) {
        toast({ title: "Error", description: "Invalid venue slug.", variant: "destructive" });
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        // Fetch venue details
        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id, slug, name, booking_fee, verified_status")
          .eq("slug", slug)
          .single();

        if (venueError || !venueData) {
          throw new Error("Venue not found");
        }

        if (venueData.verified_status !== "True") {
          throw new Error("This venue is not verified for booking.");
        }

        setVenue(venueData);

        // Fetch user email for Paystack
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user?.email) {
          setUserEmail(session.session.user.email);
        } else {
          throw new Error("User not authenticated.");
        }
      } catch (error: any) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load booking form.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchVenueAndUser();
  }, [slug, navigate, toast]);

  // Calculate amount when duration or venue changes
  useEffect(() => {
    const duration = form.watch("duration");
    if (venue?.booking_fee && duration) {
      setAmount(venue.booking_fee * duration);
    }
  }, [form.watch("duration"), venue]);

  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const onPaystackSuccess = async (reference: any) => {
    const values = form.getValues();
    try {
      const accessCode = generateAccessCode();
      const [startHours, startMinutes] = values.start_time.split(":").map(Number);
      const endTime = new Date(
        new Date(values.match_date).setHours(startHours, startMinutes, 0, 0) + values.duration * 60 * 60 * 1000
      );
      const endTimeStr = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

      // Insert booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        venue_id: venue!.id,
        amount: amount,
        payment_status: "paid",
        payment_reference: reference.reference,
      });

      if (bookingError) throw bookingError;

      // Insert access code
      const { error: accessCodeError } = await supabase.from("venue_access_codes").insert({
        venue_id: venue!.id,
        code: accessCode,
        match_date: format(values.match_date, "yyyy-MM-dd"),
        start_time: values.start_time,
        end_time: endTimeStr,
      });

      if (accessCodeError) throw accessCodeError;

      toast({
        title: "Success",
        description: "Booking successful! Redirecting to organize match...",
      });

      navigate(`/organize?venue=${venue!.slug}&code=${accessCode}`);
    } catch (error: any) {
      console.error("Error saving booking:", error);
      toast({
        title: "Error",
        description: "Failed to save booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onPaystackClose = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment. Please try again to complete the booking.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!venue || !userEmail) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Error</h2>
          <p className="text-gray-500 dark:text-gray-400">Unable to load booking form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Book {venue.name}</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <Form {...form}>
          <form className="space-y-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <FormField
              control={form.control}
              name="match_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left text-base font-normal border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="time"
                        className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                      <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration (hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Price per hour: ₦{venue.booking_fee.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Amount: ₦{amount.toFixed(2)}
              </p>
            </div>

            <PaystackButton
              email={userEmail}
              amount={amount * 100} // Paystack expects amount in kobo
              publicKey={import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "your-paystack-public-key"}
              text="Pay Now"
              onSuccess={onPaystackSuccess}
              onClose={onPaystackClose}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
            />
          </form>
        </Form>
      </div>

      <Navbar />
    </div>
  );
};

export default VenueBookingForm;
