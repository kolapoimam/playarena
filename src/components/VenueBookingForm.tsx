import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { CalendarIcon, ArrowLeft, Clock, Loader } from "lucide-react";
import Navbar from "@/components/Navbar";

type Venue = {
  id: string;
  slug: string;
  name: string;
  booking_fee: number;
  verified_status: 'True' | 'False';
};

type PaymentStatus = "pending" | "success" | "failed";

const bookingSchema = z.object({
  match_date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date",
  }),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid start time in HH:MM format (24-hour clock)",
  }),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid end time in HH:MM format (24-hour clock)",
  }),
}).refine(
  (data) => {
    const now = new Date();
    const selectedDateTime = new Date(data.match_date);
    const [startHours, startMinutes] = data.start_time.split(":").map(Number);
    selectedDateTime.setHours(startHours, startMinutes, 0, 0);
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    return selectedDateTime >= tenMinutesLater;
  },
  { message: "Booking must be scheduled at least 10 minutes from now", path: ["start_time"] }
).refine(
  (data) => {
    const [startHours, startMinutes] = data.start_time.split(":").map(Number);
    const [endHours, endMinutes] = data.end_time.split(":").map(Number);
    const start = new Date(0);
    start.setHours(startHours, startMinutes);
    const end = new Date(0);
    end.setHours(endHours, endMinutes);
    return end > start;
  },
  { message: "End time must be after start time", path: ["end_time"] }
).refine(
  (data) => {
    const [startHours, startMinutes] = data.start_time.split(":").map(Number);
    const [endHours, endMinutes] = data.end_time.split(":").map(Number);
    const start = new Date(0);
    start.setHours(startHours, startMinutes);
    const end = new Date(0);
    end.setHours(endHours, endMinutes);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours <= 12;
  },
  { message: "Booking duration cannot exceed 12 hours", path: ["end_time"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;

const VenueBookingForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [amount, setAmount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const defaultEmail = "kolapoimam1@gmail.com";

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      match_date: undefined,
      start_time: "",
      end_time: "",
    },
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load Paystack script. Please try again.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  useEffect(() => {
    const fetchVenueAndUser = async () => {
      if (!slug) {
        toast({ title: "Error", description: "Invalid venue slug.", variant: "destructive" });
        navigate("/");
        return;
      }

      setLoading(true);
      try {
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

        const { data: session } = await supabase.auth.getSession();
        const email = session.session?.user?.email || defaultEmail;
        setUserEmail(email);
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

  useEffect(() => {
    if (!paymentReference || !venue) return;

    const verifyPayment = async () => {
      setVerifyingPayment(true);
      try {
        const response = await supabase.functions.invoke("verify-paystack-transaction", {
          body: { reference: paymentReference },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const { verified, resource_id, slug: returnedSlug, resource_type } = response.data;

        if (verified && resource_id === venue.id && returnedSlug === venue.slug && resource_type === "venue") {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your booking.",
          });
        } else {
          setPaymentStatus("failed");
          toast({
            title: "Payment Verification Failed",
            description: "We could not verify your payment. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setPaymentStatus("failed");
        toast({
          title: "Payment Verification Error",
          description: "An error occurred while verifying your payment.",
          variant: "destructive",
        });
      } finally {
        setVerifyingPayment(false);
      }
    };

    verifyPayment();
  }, [paymentReference, venue, toast]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (venue && value.start_time && value.end_time) {
        const [startHours, startMinutes] = value.start_time.split(":").map(Number);
        const [endHours, endMinutes] = value.end_time.split(":").map(Number);
        const start = new Date(0);
        start.setHours(startHours, startMinutes);
        const end = new Date(0);
        end.setHours(endHours, endMinutes);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        setAmount(venue.booking_fee * durationHours);
      } else {
        setAmount(0);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, venue]);

  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handlePaymentInitiation = async () => {
    if (!venue || !amount || !paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Payment system is not ready or amount is invalid. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaying(true);

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: userEmail,
          amount: amount,
          resource_id: venue.id,
          slug: venue.slug,
          name: venue.name,
          resource_type: "venue",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { access_code } = response.data;

      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: userEmail || defaultEmail,
        amount: amount * 100, // Paystack expects kobo, but Edge Function handles this
        onSuccess: (transaction) => {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your booking.",
          });
          setPaying(false);
        },
        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment. Please try again to complete the booking.",
            variant: "destructive",
          });
          setPaying(false);
        },
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const onSubmit = async (values: BookingFormValues) => {
    if (!venue || paymentStatus !== "success") {
      toast({
        title: "Error",
        description: "Please complete the payment before submitting the booking.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaying(true);
      const accessCode = generateAccessCode();

      const { error: bookingError } = await supabase.from("bookings").insert({
        venue_id: venue.id,
        amount: amount,
        payment_status: "paid",
        payment_reference: paymentReference,
      });

      if (bookingError) throw bookingError;

      const { error: accessCodeError } = await supabase.from("venue_access_codes").insert({
        venue_id: venue.id,
        code: accessCode,
        match_date: format(values.match_date, "yyyy-MM-dd"),
        start_time: values.start_time,
        end_time: values.end_time,
      });

      if (accessCodeError) throw accessCodeError;

      toast({
        title: "Success",
        description: "Booking successful! Redirecting to organize match...",
      });

      navigate(`/organize?venue=${venue.slug}&code=${accessCode}`);
    } catch (error: any) {
      console.error("Error saving booking:", error);
      toast({
        title: "Error",
        description: "Failed to save booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading || verifyingPayment) {
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
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">End Time</FormLabel>
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

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Price per hour: ₦{venue.booking_fee.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Amount: ₦{amount.toFixed(2)}
              </p>
            </div>

            {amount > 0 && paymentStatus === "pending" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Payment Required</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please complete the payment to book this venue.
                </p>
                <Button
                  type="button"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
                  onClick={handlePaymentInitiation}
                  disabled={paying || !paystackLoaded || !amount}
                >
                  {paying ? (
                    <>
                      <Loader size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay Now (₦${amount.toFixed(2)})`
                  )}
                </Button>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-700">
                <p className="font-medium">Payment Successful!</p>
                <p className="text-sm">Please complete your booking below.</p>
                {paymentReference && (
                  <p className="text-sm mt-1">Reference: {paymentReference}</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg mt-4"
                  disabled={paying}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {paying ? (
                    <>
                      <Loader size={16} className="mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Complete Booking"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>

      <Navbar />
    </div>
  );
};

export default VenueBookingForm;
