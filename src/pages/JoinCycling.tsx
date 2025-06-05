import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Loader } from "lucide-react";
import CyclingSuccessDialog from "@/components/CyclingSuccessDialog";
import Navbar from "@/components/Navbar";

type Landmark = {
  name: string;
  state: string;
};

type Attendee = {
  id_uuid: string;
  attendee_name: string;
  attendee_phone: string;
  confirmation_code: string;
  payment_status: boolean;
  cycling_event_id_uuid: string;
};

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price?: number; // Price in Naira
  host_name: string;
  host_phone: string;
  start_landmark: Landmark;
  is_own_bike: boolean;
  is_rental_available: boolean;
};

type PaymentStatus = "pending" | "success" | "failed";

const formSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name cannot exceed 50 characters"),
    phone: z.string().regex(/^[0-9]{11}$/, "Phone number must be exactly 11 digits"),
    is_own_bike: z.boolean().optional(),
    is_rental_bike: z.boolean().optional(),
  })
  .refine(
    (data) => data.is_own_bike !== data.is_rental_bike,
    {
      message: "You must select exactly one option: either 'Bring Own Bike' or 'Rent a Bike'.",
      path: ["is_rental_bike"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const JoinCycling = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(
    searchParams.get("reference") || searchParams.get("trxref")
  );
  const [event, setEvent] = useState<CyclingEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "", is_own_bike: false, is_rental_bike: false },
  });

  const defaultEmail = "payments@sportcliq.com";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          setUserId(session.session.user.id);
        }
      } catch (err: any) {
        console.error('No authentication found:', err);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load Paystack script.",
        variant: "error",
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [toast]);

  useEffect(() => {
    if (!slug) return;
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            id_uuid,
            slug,
            title,
            event_date,
            start_time,
            max_attendees,
            is_free,
            price,
            host_name,
            host_phone,
            is_own_bike,
            is_rental_available,
            start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
          `)
          .eq("slug", slug)
          .single();
        if (error) throw error;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.id_uuid)) {
          throw new Error(`Invalid event ID format: ${data.id_uuid}`);
        }

        setEvent(data);

        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("id_uuid, attendee_name, attendee_phone, confirmation_code, payment_status, cycling_event_id_uuid")
          .eq("cycling_event_id_uuid", data.id_uuid);
        if (!attendeesError) setAttendees(attendeesData || []);
      } catch (err: any) {
        console.error('Error:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to load event.',
          variant: 'error',
        });
        navigate('/cycling-activities');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug, navigate, toast]);

  useEffect(() => {
    if (!paymentReference || !event?.id_uuid) return;

    const verifyPayment = async (retries = 3, delay = 1000) => {
      setVerifyingPayment(true);
      try {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke('verify-paystack-transaction', {
              body: { reference: paymentReference },
            });
            if (error) throw error;
            const { verified, event_id, slug: resourceSlug } = data;
            if (verified && event_id === event.id_uuid && resourceSlug === event.slug) {
              setPaymentStatus('success');
              toast({
                title: 'Payment Successful',
                description: `Payment of ${formatter.format(event.price || 0)} processed successfully. Please complete your registration.`,
              });
              return;
            } else {
              throw new Error('Payment verification failed: Invalid payment details');
            }
          } catch (error: any) {
            console.error(`Verification attempt ${attempt} failed: ${error.message}. Retrying...`);
            if (attempt === retries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        setPaymentStatus('failed');
        toast({
          title: 'Payment Verification Error',
          description: 'Failed to verify your payment. Please try again or contact support.',
          variant: 'error',
        });
      } finally {
        setVerifyingPayment(false);
      }
    };

    verifyPayment();
  }, [paymentReference, event, toast]);

  const handlePaymentInitiation = async () => {
    if (!event || event.is_free || !event.price) {
      toast({
        title: 'Error',
        description: 'Event not configured for payment.',
        variant: 'error',
      });
      return;
    }

    if (!paystackLoaded || !window.PaystackPop) {
      toast({
        title: 'Error',
        description: 'Paystack not available.',
        variant: 'error',
      });
      return;
    }

    const amountInNaira = Number(event.price); // event.price is in Naira

    if (!Number.isFinite(amountInNaira) || amountInNaira < 1) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum payment is ₦1.00.',
        variant: 'error',
      });
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(event.id_uuid)) {
      console.error('Invalid event_id format:', event.id_uuid);
      toast({
        title: 'Error',
        description: 'Invalid event configuration.',
        variant: 'error',
      });
      return;
    }

    try {
      setJoining(true);
      const response = await supabase.functions.invoke('initialize-paystack-transaction', {
        body: {
          email: defaultEmail,
          amount: amountInNaira, // Send Naira to Paystack
          event_id: event.id_uuid,
          slug: event.slug,
          title: event.title,
          callback_url: `${window.location.origin}/join-cycling/${event.slug}`,
          metadata: {
            event_id: event.id_uuid,
            resource_type: 'cycling',
            user_phone: form.getValues('phone') || 'unknown',
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to initialize payment');
      }

      const { access_code } = response.data;
      if (!access_code) {
        throw new Error('No access code returned from payment initialization');
      }

      const paystack = new window.PaystackPop();
      paystack.resumeTransaction(access_code, {
        onSuccess: (transaction: { reference: string }) => {
          console.log('Payment successful, transaction:', transaction);
          setPaymentReference(transaction.reference);
          setPaymentStatus('success');
          toast({
            title: 'Payment Initiated',
            description: `Payment of ${formatter.format(amountInNaira)} initiated. Complete your registration.`,
          });
          setJoining(false);
        },
        onCancel: () => {
          console.log('Payment cancelled');
          toast({
            title: 'Payment Cancelled',
            description: 'Payment processing cancelled.',
            variant: 'error',
          });
          setJoining(false);
        },
      });
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment.',
        variant: 'error',
      });
      setJoining(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!event || !event.id_uuid) {
      toast({
        title: 'Error',
        description: 'Event not loaded or invalid.',
        variant: 'error',
      });
      return;
    }

    if (attendees.length >= event.max_attendees) {
      toast({
        title: 'Error',
        description: 'Event is full.',
        variant: 'error',
      });
      return;
    }

    setJoining(true);
    try {
      const { data: confirmationCode, error: codeError } = await supabase.rpc(
        'generate_unique_confirmation_code',
        { event_id: event.id_uuid }
      );
      if (codeError || !confirmationCode) {
        throw new Error(`Failed to generate confirmation code: ${codeError?.message || 'No code data'}`);
      }

      const attendeeData = {
        id_uuid: crypto.randomUUID(),
        cycling_event_id_uuid: event.id_uuid,
        attendee_name: data.name,
        attendee_phone: data.phone,
        confirmation_code: confirmationCode,
        payment_status: event.is_free || paymentStatus === 'success',
        is_own_bike: event.is_own_bike ? data.is_own_bike : null,
        is_rental_bike: event.is_rental_available ? data.is_rental_bike : null,
      };

      const { data: attendeeRecord, error: attendeeError } = await supabase
        .from('cycling_attendees')
        .insert(attendeeData)
        .select('id_uuid')
        .single();

      if (attendeeError || !attendeeRecord) {
        throw new Error(`Failed to create attendee: ${attendeeError?.message || 'No attendee data'}`);
      }

      if (userId) {
        const { error: userJoinedError } = await supabase
          .from('user_joined_cycling')
          .insert({
            user_id: userId,
            cycling_event_id: event.id_uuid,
            attendee_id: attendeeRecord.id_uuid,
          });

        if (userJoinedError) {
          console.error('Error inserting into user_joined_cycling:', userJoinedError);
          throw new Error(`Failed to record joined event: ${userJoinedError.message}`);
        }
      }

      setConfirmationCode(confirmationCode);
      setSuccessDialogOpen(true);
      toast({
        title: 'Success',
        description: 'Joined event successfully.',
      });

      const { data: updatedAttendees } = await supabase
        .from('cycling_attendees')
        .select('id_uuid, attendee_name, attendee_phone, confirmation_code, payment_status, cycling_event_id_uuid')
        .eq('cycling_event_id_uuid', event.id_uuid);
      if (updatedAttendees) setAttendees(updatedAttendees);
    } catch (error: any) {
      console.error('Error joining event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join event.',
        variant: 'error',
      });
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-NG', options);
  };

  const handleNavigate = () => {
    navigate(`/cycling/${event?.slug || ''}`);
  };

  if (loading || verifyingPayment) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">The event doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isFull = attendees.length >= event.max_attendees;
  const isPastEvent = new Date(event.event_date) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-md shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Join Cycling Event</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
          <div className="text-muted-foreground mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{event.start_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{event.start_landmark.name}, {event.start_landmark.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Spots available: {event.max_attendees - attendees.length} / {event.max_attendees}</span>
            </div>
            {!event.is_free && (
              <div className="flex items-center gap-2 mt-2 font-medium text-green-600">
                <span>Price: {formatter.format(event.price || 0)}</span>
              </div>
            )}
          </div>
          {isPastEvent ? (
            <div className="text-center py-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">This event has already passed</h2>
              <p className="text-muted-foreground mt-2">You cannot join this event anymore.</p>
              <Button
                className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => navigate("/cycling-activities")}
              >
                Browse Other Events
              </Button>
            </div>
          ) : isFull ? (
            <div className="text-center py-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">This event is full</h2>
              <p className="text-muted-foreground mt-2">All spots are taken.</p>
              <Button
                className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => navigate(`/cycling/${event.slug}`)}
              >
                View Event Details
              </Button>
            </div>
          ) : (
            <>
              {(event.is_free || paymentStatus === "success") && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your name"
                              {...field}
                              className="border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              placeholder="Enter 11-digit phone number"
                              {...field}
                              className="border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500"
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/\D/g, "").slice(0, 11);
                                field.onChange(numericValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />
                    {(event.is_own_bike || event.is_rental_available) && (
                      <div className="space-y-2">
                        {event.is_own_bike && (
                          <FormField
                            control={form.control}
                            name="is_own_bike"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        form.setValue("is_rental_bike", false);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">Bring Own Bike</FormLabel>
                              </FormItem>
                            )}
                          />
                        )}
                        {event.is_rental_available && (
                          <FormField
                            control={form.control}
                            name="is_rental_bike"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        form.setValue("is_own_bike", false);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">Rent a Bike</FormLabel>
                              </FormItem>
                            )}
                          />
                        )}
                        <FormMessage className="text-red-500" />
                      </div>
                    )}
                    {event.is_free && (
                      <Button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md"
                        disabled={joining}
                      >
                        {joining ? (
                          <>
                            <Loader size={16} className="mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          "Join Event"
                        )}
                      </Button>
                    )}
                    {paymentStatus === "success" && (
                      <>
                        <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-700">
                          <p className="font-medium">Payment Successful!</p>
                          <p className="text-sm">Please complete your registration below.</p>
                          {paymentReference && (
                            <p className="text-sm mt-1">Reference: {paymentReference}</p>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md"
                          disabled={joining}
                        >
                          {joining ? (
                            <>
                              <Loader size={16} className="mr-2 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            "Join Event"
                          )}
                        </Button>
                      </>
                    )}
                  </form>
                </Form>
              )}
              {!event.is_free && paymentStatus === "pending" && (
                <>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6">Payment Required</h3>
                  <p className="text-muted-foreground">
                    This is a paid event. Please complete the payment to join.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium mt-2">
                    <span>Total: {formatter.format(event.price || 0)}</span>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 transition-colors mt-4 rounded-lg"
                    onClick={handlePaymentInitiation}
                    disabled={joining || !paystackLoaded}
                  >
                    {joining ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay Now (${formatter.format(event.price || 0)})`
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {event && confirmationCode && (
        <CyclingSuccessDialog
          open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          formValues={{
            title: event.title,
            event_date: new Date(event.event_date),
            start_time: event.start_time,
            host_name: event.host_name,
          }}
          selectedLandmark={{
            name: event.start_landmark.name,
            state: event.start_landmark.state,
          }}
          confirmationCode={confirmationCode}
          eventSlug={event.slug}
          onNavigate={handleNavigate}
        />
      )}
      <Navbar />
    </div>
  );
};

export default JoinCycling;
