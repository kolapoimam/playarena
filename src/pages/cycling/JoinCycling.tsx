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
import { ArrowLeft, Calendar, Clock, MapPin, Users, Loader, Bike, KeyRound, Wallet, CheckCircle2 } from "lucide-react";
import CyclingSuccessDialog from "@/components/cycling/CyclingSuccessDialog";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";

import { BackButton, Bubble, Cover, FunEmpty, ScButton, SPORT, formatTime12 } from "@/components/sc/ui";
import { RowsSkeleton, PageSkeleton } from "@/components/sc/skeletons";
import { notify } from "@/lib/notify";
const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

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

  const defaultEmail = "sportcliqapp@gmail.com";

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
      notify("ride_joined", { event_id: event.id_uuid, attendee_id: attendeeRecord.id_uuid });

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
    return <PageSkeleton />;
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
    <>
      <Seo
        title={event ? `Join ${event.title} | Cycling | Sport Cliq` : "Join Cycling Event | Sport Cliq"}
        description={event ? `Register for ${event.title} cycling event on Sport Cliq. Cycling in Nigeria, Bicycle Training in Nigeria, Play Sports Near You, Nigerian cycling, Nigerian sports, Sportstech, Osimhen, Asisat Oshola.` : "Register for a cycling event on Sport Cliq. Cycling in Nigeria, Bicycle Training in Nigeria, Play Sports Near You, Nigerian cycling, Nigerian sports, Sportstech, Osimhen, Asisat Oshola."}
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-36 bg-sc-bg">
        <div className="relative h-[220px] overflow-hidden rounded-b-[36px]">
          <Cover kind="cycling" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
          <div className="absolute left-5 right-5 flex justify-between items-center" style={{ top: "max(env(safe-area-inset-top), 1rem)" }}>
            <BackButton className="mt-3" />
            <span className="mt-3 h-8 px-3 rounded-full bg-white/90 text-sc-ink text-xs font-extrabold inline-flex items-center">Join ride</span>
          </div>
          <div className="absolute left-5 right-5 bottom-5 text-white">
            <h1 className="m-0 text-[28px] leading-8 font-extrabold tracking-[-0.03em]">{event.title}</h1>
            <span className="text-sm opacity-90">From {event.start_landmark.name}, {event.start_landmark.state}</span>
          </div>
        </div>

        <div className="px-5 pt-[18px] flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Calendar, sport: "cycling" as const, label: "Date", value: new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
              { icon: Clock, sport: "guide" as const, label: "Starts", value: formatTime12(event.start_time) },
              { icon: Users, sport: "pink" as const, label: "Spots left", value: `${Math.max(event.max_attendees - attendees.length, 0)} of ${event.max_attendees}` },
            ].map((f) => (
              <div key={f.label} className="min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-1.5">
                <Bubble icon={f.icon} sport={f.sport} size={32} />
                <span className="text-xs text-sc-ink3 font-semibold">{f.label}</span>
                <span className="text-[14px] font-extrabold truncate">{f.value}</span>
              </div>
            ))}
          </div>

          {isPastEvent ? (
            <FunEmpty icon={Bike} sport="cycling" title="This ride has rolled out" body="The crew has already finished this one. Catch the next ride from a landmark near you." primary={{ label: "Find another ride", onClick: () => navigate("/cycling-activities") }} />
          ) : isFull ? (
            <FunEmpty icon={Users} sport="red" title="The crew is full" body="Every spot on this ride is taken. Check the ride page in case one opens up." primary={{ label: "View ride", onClick: () => navigate(`/cycling/${event.slug}`) }} secondary={{ label: "Find another ride", onClick: () => navigate("/cycling-activities") }} />
          ) : !event.is_free && paymentStatus === "pending" ? (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Bubble icon={Wallet} sport="cycling" size={44} radius={14} />
                <span className="flex flex-col">
                  <span className="text-base font-extrabold">Pay to lock your spot</span>
                  <span className="text-[13px] text-sc-ink3">Paid securely with Paystack</span>
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-sc-ink3 font-semibold">Total</span>
                <span className="text-[26px] font-extrabold tracking-[-0.02em]">{formatter.format(event.price || 0)}</span>
              </div>
              <ScButton kind="cycling" onClick={handlePaymentInitiation} disabled={joining || !paystackLoaded}>
                {joining ? "Processing..." : !paystackLoaded ? "Getting payment ready..." : `Pay ${formatter.format(event.price || 0)}`}
              </ScButton>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white rounded-3xl p-[18px] flex flex-col gap-4">
                {paymentStatus === "success" && (
                  <div className="rounded-2xl p-4 flex gap-3" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>
                    <CheckCircle2 size={22} className="shrink-0" />
                    <span className="flex flex-col text-sm"><b>Payment received</b><span>Finish your details to join.{paymentReference ? ` Ref ${paymentReference}` : ""}</span></span>
                  </div>
                )}
                <span className="text-base font-extrabold">Your details</span>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-sc-ink">Your name</FormLabel>
                      <FormControl><Input placeholder="Full name" autoComplete="name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-sc-ink">Phone number</FormLabel>
                      <FormControl>
                        <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="11-digit phone number" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(event.is_own_bike || event.is_rental_available) && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold">Your bike</span>
                    <div className="grid grid-cols-2 gap-2">
                      {event.is_own_bike && (
                        <button
                          type="button"
                          onClick={() => { form.setValue("is_own_bike", true); form.setValue("is_rental_bike", false); }}
                          aria-pressed={!!form.watch("is_own_bike")}
                          className={`h-[64px] rounded-2xl px-3 flex items-center gap-2.5 text-left text-sm font-bold border-2 ${form.watch("is_own_bike") ? "border-[#F97316] bg-[#FFF7ED]" : "border-sc-line bg-white"}`}
                        >
                          <Bike size={20} className="text-[#C2410C]" /> Bring your bike
                        </button>
                      )}
                      {event.is_rental_available && (
                        <button
                          type="button"
                          onClick={() => { form.setValue("is_rental_bike", true); form.setValue("is_own_bike", false); }}
                          aria-pressed={!!form.watch("is_rental_bike")}
                          className={`h-[64px] rounded-2xl px-3 flex items-center gap-2.5 text-left text-sm font-bold border-2 ${form.watch("is_rental_bike") ? "border-[#F97316] bg-[#FFF7ED]" : "border-sc-line bg-white"}`}
                        >
                          <KeyRound size={20} className="text-[#C2410C]" /> Rent a bike
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <ScButton type="submit" kind="cycling" disabled={joining}>{joining ? "Joining..." : "Join ride"}</ScButton>
              </form>
            </Form>
          )}
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
    </>
  );
};

export default JoinCycling;
