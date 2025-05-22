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
import { format, isWithinInterval } from "date-fns";
import { CalendarIcon, ArrowLeft, Loader } from "lucide-react";
import { lazy, Suspense } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import TimeInput from "@/components/TimeInput";

// Lazy load Navbar to avoid circular dependencies
const Navbar = lazy(() => import("@/components/Navbar"));

type Venue = {
  id: string;
  slug: string;
  name: string;
  booking_fee: number;
  verified_vstatus: 'True' | 'False';
};

type PaymentStatus = "pending" | "success" | "failed";

// Utility function to convert 24-hour time (HH:MM:SS) to 12-hour format with AM/PM
const convertTo12HourFormat = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const bookingSchema = z.object({
  match_date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date",
  }),
  start_time: z.string().regex(/^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/, {
    message: "Please enter a valid start time in HH:MM AM/PM format (12-hour clock)",
  }),
  end_time: z.string().regex(/^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/, {
    message: "Please enter a valid end time in HH:MM AM/PM format (12-hour clock)",
  }),
}).refine(
  (data) => {
    const now = new Date();
    const selectedDateTime = new Date(data.match_date);
    const [startTime, period] = data.start_time.split(" ");
    let [startHours, startMinutes] = startTime.split(":").map(Number);
    if (period === "PM" && startHours !== 12) startHours += 12;
    if (period === "AM" && startHours === 12) startHours = 0;
    selectedDateTime.setHours(startHours, startMinutes, 0, 0);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    return selectedDateTime >= oneHourLater;
  },
  { message: "Booking must start at least 1 hour from now", path: ["start_time"] }
).refine(
  (data) => {
    const [startTime, startPeriod] = data.start_time.split(" ");
    const [endTime, endPeriod] = data.end_time.split(" ");
    let [startHours, startMinutes] = startTime.split(":").map(Number);
    let [endHours, endMinutes] = endTime.split(":").map(Number);
    if (startPeriod === "PM" && startHours !== 12) startHours += 12;
    if (startPeriod === "AM" && startHours === 12) startHours = 0;
    if (endPeriod === "PM" && endHours !== 12) endHours += 12;
    if (endPeriod === "AM" && endHours === 12) endHours = 0;
    const start = new Date(0);
    start.setHours(startHours, startMinutes);
    const end = new Date(0);
    end.setHours(endHours, endMinutes);
    const durationMs = end.getTime() - start.getTime();
    return durationMs >= 60 * 60 * 1000;
  },
  { message: "End time must be at least 1 hour after start time", path: ["end_time"] }
).refine(
  (data) => {
    const [startTime, startPeriod] = data.start_time.split(" ");
    const [endTime, endPeriod] = data.end_time.split(" ");
    let [startHours, startMinutes] = startTime.split(":").map(Number);
    let [endHours, endMinutes] = endTime.split(":").map(Number);
    if (startPeriod === "PM" && startHours !== 12) startHours += 12;
    if (startPeriod === "AM" && startHours === 12) startHours = 0;
    if (endPeriod === "PM" && endHours !== 12) endHours += 12;
    if (endPeriod === "AM" && endHours === 12) endHours = 0;
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
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const [useAccessCode, setUseAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
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
        console.error("Error fetching venue:", error);
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

  const validateAccessCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from("booking_access_codes")
        .select("code, valid_until, access_code_status, venue_id, match_date, start_time, end_time, booking_id")
        .eq("code", code)
        .eq("venue_id", venue?.id)
        .single();

      if (error || !data) {
        setAccessCodeError("Invalid access code.");
        return null;
      }

      if (data.access_code_status !== "Pending") {
        setAccessCodeError("Access code is not valid or has already been used.");
        return null;
      }

      if (data.booking_id) {
        setAccessCodeError("Access code has already been used.");
        return null;
      }

      const validUntil = new Date(data.valid_until);
      if (validUntil < new Date()) {
        setAccessCodeError("Access code has expired.");
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error validating access code:", error);
      setAccessCodeError("Failed to validate access code.");
      return null;
    }
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (venue && value.match_date && value.start_time && value.end_time && !useAccessCode) {
        const [startTime, startPeriod] = value.start_time.split(" ");
        const [endTime, endPeriod] = value.end_time.split(" ");
        let [startHours, startMinutes] = startTime.split(":").map(Number);
        let [endHours, endMinutes] = endTime.split(":").map(Number);
        if (startPeriod === "PM" && startHours !== 12) startHours += 12;
        if (startPeriod === "AM" && startHours === 12) startHours = 0;
        if (endPeriod === "PM" && endHours !== 12) endHours += 12;
        if (endPeriod === "AM" && endHours === 12) endHours = 0;
        const startDateTime = new Date(value.match_date);
        startDateTime.setHours(startHours, startMinutes, 0, 0);
        const endDateTime = new Date(value.match_date);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        // Check availability
        const checkAvailability = async () => {
          const { data, error } = await supabase
            .from("venue_access_codes")
            .select("match_date, start_time, end_time")
            .eq("venue_id", venue.id)
            .eq("match_date", format(value.match_date, "yyyy-MM-dd"));

          if (error) {
            console.error("Error checking availability:", error);
            setIsSlotAvailable(false);
            return;
          }

          const isConflict = data.some((booking) => {
            const bookingStart = new Date(booking.match_date);
            const [bookingStartH, bookingStartM] = booking.start_time.split(":").map(Number);
            bookingStart.setHours(bookingStartH, bookingStartM, 0, 0);

            const bookingEnd = new Date(booking.match_date);
            const [bookingEndH, bookingEndM] = booking.end_time.split(":").map(Number);
            bookingEnd.setHours(bookingEndH, bookingEndM, 0, 0);

            return (
              (startDateTime < bookingEnd && endDateTime > bookingStart)
            );
          });

          setIsSlotAvailable(!isConflict);
        };

        checkAvailability();

        // Calculate amount
        const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
        setAmount(venue.booking_fee * durationHours);
      } else if (!useAccessCode) {
        setAmount(0);
        setIsSlotAvailable(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, venue, useAccessCode]);

  const handleAccessCodeChange = async (code: string) => {
    setAccessCode(code);
    setAccessCodeError(null);

    if (code.length === 6) {
      const accessCodeData = await validateAccessCode(code);
      if (accessCodeData) {
        const matchDate = new Date(accessCodeData.match_date);
        const startTime12Hour = convertTo12HourFormat(accessCodeData.start_time);
        const endTime12Hour = convertTo12HourFormat(accessCodeData.end_time);
        form.setValue("match_date", matchDate);
        form.setValue("start_time", startTime12Hour);
        form.setValue("end_time", endTime12Hour);
        setPaymentStatus("success");
        setAmount(0);
        setIsSlotAvailable(true);
      } else {
        form.reset({
          match_date: undefined,
          start_time: "",
          end_time: "",
        });
        setPaymentStatus("pending");
        setAmount(0);
      }
    } else {
      form.reset({
        match_date: undefined,
        start_time: "",
        end_time: "",
      });
      setPaymentStatus("pending");
      setAmount(0);
    }
  };

  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handlePaymentInitiation = async () => {
    if (!venue || !amount || !paystackLoaded || !window.PaystackPop || !isSlotAvailable) {
      toast({
        title: "Error",
        description: isSlotAvailable ? "Payment system is not ready or amount is invalid." : "This time slot is already booked. Please choose a different time.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaying(true);

      const [startTime, startPeriod] = form.getValues("start_time").split(" ");
      let startHours = parseInt(startTime.split(":")[0], 10);
      if (startPeriod === "PM" && startHours !== 12) startHours += 12;
      if (startPeriod === "AM" && startHours === 12) startHours = 0;

      const [endTime, endPeriod] = form.getValues("end_time").split(" ");
      let endHours = parseInt(endTime.split(":")[0], 10);
      if (endPeriod === "PM" && endHours !== 12) endHours += 12;
      if (endPeriod === "AM" && endHours === 12) endHours = 0;

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: userEmail || defaultEmail,
          amount: amount,
          venue_id: venue.id,
          slug: venue.slug,
          title: `Venue Booking - ${venue.name}`,
          start_time: `${startHours.toString().padStart(2, "0")}:${startTime.split(":")[1]}`,
          end_time: `${endHours.toString().padStart(2, "0")}:${endTime.split(":")[1]}`,
          match_date: format(form.getValues("match_date"), "yyyy-MM-dd"),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { access_code } = response.data;

      const paystack = new window.PaystackPop();
      paystack.resumeTransaction(access_code, {
        onSuccess: (transaction) => {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your booking.",
          });
          navigate(`/venue/${venue.slug}/book?reference=${transaction.reference}`);
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
    } catch (error: any) {
      console.error("Payment Initiation Error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const onSubmit = async (values: BookingFormValues) => {
    if (!venue || (paymentStatus !== "success" && !useAccessCode)) {
      toast({
        title: "Error",
        description: "Please complete the payment or enter a valid access code before submitting the booking.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaying(true);
      let bookingAccessCode = accessCode;
      if (!useAccessCode) {
        bookingAccessCode = generateAccessCode();
      }

      const [startTime, startPeriod] = values.start_time.split(" ");
      let startHours = parseInt(startTime.split(":")[0], 10);
      if (startPeriod === "PM" && startHours !== 12) startHours += 12;
      if (startPeriod === "AM" && startHours === 12) startHours = 0;

      const [endTime, endPeriod] = values.end_time.split(" ");
      let endHours = parseInt(endTime.split(":")[0], 10);
      if (endPeriod === "PM" && endHours !== 12) endHours += 12;
      if (endPeriod === "AM" && endHours === 12) endHours = 0;

      const bookingPayload = useAccessCode
        ? {
            venue_id: venue.id,
            amount: 0,
            payment_status: "paid",
            payment_reference: null,
            match_date: format(values.match_date, "yyyy-MM-dd"),
            start_time: `${startHours.toString().padStart(2, "0")}:${startTime.split(":")[1]}`,
            end_time: `${endHours.toString().padStart(2, "0")}:${endTime.split(":")[1]}`,
          }
        : {
            venue_id: venue.id,
            amount: amount,
            payment_status: "paid",
            payment_reference: paymentReference,
            match_date: format(values.match_date, "yyyy-MM-dd"),
            start_time: `${startHours.toString().padStart(2, "0")}:${startTime.split(":")[1]}`,
            end_time: `${endHours.toString().padStart(2, "0")}:${endTime.split(":")[1]}`,
          };

      const { data: bookingData, error: bookingError } = await supabase.from("bookings").insert(bookingPayload).select().single();

      if (bookingError) throw bookingError;

      const accessCodePayload = {
        venue_id: venue.id,
        booking_id: bookingData.id,
        code: bookingAccessCode,
        match_date: format(values.match_date, "yyyy-MM-dd"),
        start_time: `${startHours.toString().padStart(2, "0")}:${startTime.split(":")[1]}`,
        end_time: `${endHours.toString().padStart(2, "0")}:${endTime.split(":")[1]}`,
        access_code_status: "Active",
      };

      if (useAccessCode) {
        const { error: updateAccessCodeError } = await supabase
          .from("booking_access_codes")
          .update({
            booking_id: bookingData.id,
            access_code_status: "Active",
            match_date: format(values.match_date, "yyyy-MM-dd"),
            start_time: `${startHours.toString().padStart(2, "0")}:${startTime.split(":")[1]}`,
            end_time: `${endHours.toString().padStart(2, "0")}:${endTime.split(":")[1]}`,
          })
          .eq("code", bookingAccessCode)
          .eq("venue_id", venue.id);

        if (updateAccessCodeError) throw updateAccessCodeError;
      } else {
        const { error: accessCodeError } = await supabase.from("booking_access_codes").insert(accessCodePayload);

        if (accessCodeError) throw accessCodeError;
      }

      toast({
        title: "Success",
        description: "Booking successful! Redirecting to organize match...",
      });

      navigate(`/organize?venue=${venue.slug}&code=${bookingAccessCode}`);
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
          <h1 className="text-2xl font-bold">Book Venue</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <Form {...form}>
          <form className="space-y-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAccessCode"
                checked={useAccessCode}
                onCheckedChange={(checked) => {
                  setUseAccessCode(!!checked);
                  setAccessCode("");
                  setAccessCodeError(null);
                  form.reset({
                    match_date: undefined,
                    start_time: "",
                    end_time: "",
                  });
                  setPaymentStatus("pending");
                  setAmount(0);
                }}
              />
              <label
                htmlFor="useAccessCode"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Use Access Code
              </label>
            </div>

            {useAccessCode && (
              <div>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Code</FormLabel>
                <Input
                  type="text"
                  value={accessCode}
                  onChange={(e) => handleAccessCodeChange(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character access code"
                  maxLength={6}
                  className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                {accessCodeError && (
                  <p className="text-sm text-red-600 mt-1">{accessCodeError}</p>
                )}
              </div>
            )}

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
                          disabled={paymentStatus === "success" || useAccessCode}
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
                        disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
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
                    <TimeInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={paymentStatus === "success" || useAccessCode}
                      placeholder="12:00"
                    />
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
                    <TimeInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={paymentStatus === "success" || useAccessCode}
                      placeholder="12:00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Venue: {venue.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Price per hour: ₦{venue.booking_fee.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Amount: ₦{amount.toFixed(2)}
              </p>
            </div>

            {!isSlotAvailable && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
                <p className="font-medium">Unavailable Slot</p>
                <p className="text-sm">This time slot is already booked. Please choose a different date or time.</p>
              </div>
            )}

            {amount > 0 && paymentStatus === "pending" && !useAccessCode && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Payment Required</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please complete the payment to book this venue.
                </p>
                <Button
                  type="button"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
                  onClick={handlePaymentInitiation}
                  disabled={paying || !paystackLoaded || !amount || !isSlotAvailable}
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
                {paymentReference && !useAccessCode && (
                  <p className="text-sm mt-1">Reference: {paymentReference}</p>
                )}
                {useAccessCode && (
                  <p className="text-sm mt-1">Access Code: {accessCode}</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg mt-4"
                  disabled={paying}
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

      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>
    </div>
  );
};

export default VenueBookingForm;
