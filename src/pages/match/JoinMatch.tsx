import { useState, useEffect, useCallback, useRef } from "react";
import { payerEmail } from "@/lib/payerEmail";
import { matchWindow, phase } from "@/lib/activityTime";
import { NotFoundState } from "@/components/sc/FunState";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader, Calendar, MapPin, Clock, Users, DollarSign, Phone, MessageSquare, Repeat, Wallet, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format, isToday, isPast } from "date-fns";
import MatchJoinersDialog from "@/components/match/MatchJoinersDialog";
import { Seo } from "@/components/Seo";

import { Avatar, BackButton, Bubble, Cover, FunEmpty, ScButton, SPORT, formatNairaExact, initialsOf } from "@/components/sc/ui";
import { RowsSkeleton, PageSkeleton } from "@/components/sc/skeletons";
import { notify } from "@/lib/notify";
const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  organizer_name: string;
  organizer_phone: string | null;
  disclose_phone: boolean;
  is_paid: boolean;
  price: number | null;
  player_number_required: boolean;
  required_fields: string[] | null;
  allow_bulk_tickets: boolean;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
    number_of_slots: number;
  }[];
};

type PaymentStatus = "pending" | "success" | "failed";

const JoinMatch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");
  
  const urlReference = reference || trxref;
  // Reference from the Paystack popup, when the page did not reload
  const [popupReference, setPopupReference] = useState<string | null>(null);
  const paymentReference = urlReference || popupReference;
  const submitLock = useRef(false);

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState(1);
  const [bookedSlots, setBookedSlots] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const defaultEmail = "sportcliqapp@gmail.com";

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
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
        description: "Failed to load Paystack script. Please try again.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  const createFormSchema = (requiredFields: string[] = ["name", "phone"]) => {
    const schemaFields: Record<string, any> = {};
    requiredFields.forEach((field) => {
      if (field === "phone") {
        schemaFields[field] = z
          .string()
          .regex(/^\d{11}$/, { message: "Phone number must be exactly 11 digits" })
          .min(11, { message: "Phone number must be exactly 11 digits" })
          .max(11, { message: "Phone number must be exactly 11 digits" });
      } else {
        schemaFields[field] = z
          .string()
          .min(2, { message: `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 2 characters` });
      }
    });
    return z.object(schemaFields);
  };

  const [formSchema, setFormSchema] = useState(createFormSchema());

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  // Fetch match and auto-populate form for logged-in users
  useEffect(() => {
    if (!slug) return;

    const fetchMatch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            id, slug, title, match_date, match_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
            is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
            is_recurring, recurring_frequency, recurring_occurrences,
            venue:venues(slug, name, city, image_urls),
            players(player_name, number_of_slots)
          `
          )
          .eq("slug", slug)
          .single();

        if (error) throw error;

        const requiredFields = Array.isArray(data?.required_fields)
          ? data.required_fields
          : ["name", "phone"];
        setFormSchema(createFormSchema(requiredFields));

        const defaultValues: Record<string, string> = {};
        requiredFields.forEach((field) => {
          defaultValues[field] = "";
        });

        // Auto-populate form for logged-in users
        if (userId) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("nickname, phone_number")
            .eq("id", userId)
            .single();
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            toast({
              title: "Error",
              description: "Failed to load profile details.",
              variant: "destructive",
            });
          } else {
            if (profile.nickname) defaultValues["name"] = profile.nickname;
            if (profile.phone_number) defaultValues["phone"] = profile.phone_number;
          }
        }

        form.reset(defaultValues);
        setMatch(data as Match);
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: "Error",
          description: "Failed to load match details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [slug, toast, form, userId]);

  // Details and slots are kept on the device while Paystack is open, so a page
  // reload after payment can still finish the registration by itself.
  const pendingKey = match ? `sc_join_${match.id}` : "";
  const savePending = (values: any, slots: number) => {
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ values, slots, at: Date.now() })); } catch { /* ignore */ }
  };
  const readPending = (): { values?: any; slots?: number } => {
    try { return JSON.parse(sessionStorage.getItem(pendingKey) || "{}"); } catch { return {}; }
  };
  const clearPending = () => { try { sessionStorage.removeItem(pendingKey); } catch { /* ignore */ } };
  const verifiedRefs = useRef(new Set<string>());

  /** Checks the payment with the server, then registers the player. Never trusts the popup alone. */
  const completePaidJoin = async (ref: string) => {
    if (!match || verifiedRefs.current.has(ref)) return;
    verifiedRefs.current.add(ref);
    setVerifyingPayment(true);
    try {
      const response = await supabase.functions.invoke("verify-paystack-transaction", { body: { reference: ref } });
      if (response.error) throw new Error(response.error.message);
      const { verified, match_id, slug: matchSlug, amount } = response.data || {};
      if (!(verified && match_id === match.id && matchSlug === slug)) {
        setPaymentStatus("failed");
        toast({ title: "Payment not confirmed", description: "We could not confirm this payment. If you were charged, contact support with your reference.", variant: "destructive" });
        return;
      }
      setPaymentStatus("success");
      const saved = readPending();
      // The number of slots comes from what was actually paid
      const paidSlots = Number(amount) && match.price ? Math.max(1, Math.round(Number(amount) / match.price)) : Math.max(1, Number(saved.slots) || selectedSlots);
      setSelectedSlots(paidSlots);
      const values = saved.values || form.getValues();
      const ok = formSchema.safeParse(values);
      if (ok.success) {
        form.reset(values);
        await register(values, paidSlots, ref, true);
      } else {
        form.reset(values || {});
        toast({ title: "Payment confirmed", description: "Add your details below to finish joining. Do not close this page." });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      verifiedRefs.current.delete(ref);
      setPaymentStatus("failed");
      toast({ title: "Payment check failed", description: "We could not reach the server to confirm your payment. Refresh this page to try again.", variant: "destructive" });
    } finally {
      setVerifyingPayment(false);
    }
  };

  useEffect(() => {
    if (!urlReference || !match) return;
    completePaidJoin(urlReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReference, match?.id]);

  const handlePaymentInitiation = async (values: any) => {
    if (!match || !match.is_paid || !match.price) return;

    if (!paystackLoaded || !window.PaystackPop) {
      toast({ title: "Payment is not ready", description: "Paystack did not load. Check your connection and try again.", variant: "destructive" });
      return;
    }

    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    if (totalPlayerSlots + selectedSlots > match.total_slots) {
      toast({ title: "Not enough slots", description: `Only ${match.total_slots - totalPlayerSlots} slot(s) are available.`, variant: "destructive" });
      return;
    }

    try {
      setJoining(true);
      savePending(values, selectedSlots);

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: await payerEmail(values?.email ?? form.getValues("email")),
          amount: match.price * selectedSlots,
          match_id: match.id,
          slug: match.slug,
          title: match.title,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { access_code } = response.data;

      const paystack = new window.PaystackPop();
      paystack.resumeTransaction(access_code, {
        onSuccess: (transaction) => {
          setJoining(false);
          const ref = transaction?.reference || null;
          setPopupReference(ref);
          if (ref) completePaidJoin(ref);
        },
        onCancel: () => {
          toast({ title: "Payment cancelled", description: "You were not charged." });
          setJoining(false);
        },
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast({ title: "Payment error", description: "Could not start the payment. Please try again.", variant: "destructive" });
      setJoining(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!match) return;
    if (match.is_paid && paymentStatus !== "success") return handlePaymentInitiation(data);
    return register(data, selectedSlots, paymentReference, match.is_paid && paymentStatus === "success");
  };

  /** Shows the ticket, using the slots this player actually booked. */
  const showTicket = (code: string, slots: number) => {
    setConfirmationCode(code);
    setBookedSlots(slots);
    setSuccessDialogOpen(true);
  };

  const register = async (data: any, slots: number, ref: string | null, paid: boolean) => {
    if (!match || !slug) return;
    if (submitLock.current) return;
    submitLock.current = true;
    setJoining(true);

    try {
      // One payment joins once. A repeat callback shows the ticket it already made.
      if (paid) {
        if (!ref) throw new Error("We could not find your payment reference. Please contact support.");
        const { data: used } = await supabase
          .from("players").select("id, confirmation_code, number_of_slots").eq("match_id", match.id)
          .eq("details->>payment_reference", ref).limit(1);
        if (used && used.length > 0) {
          clearPending();
          if (urlReference) window.history.replaceState(null, "", window.location.pathname);
          showTicket(used[0].confirmation_code, used[0].number_of_slots || slots);
          return;
        }
      }

      const { data: fresh } = await supabase.from("players").select("number_of_slots").eq("match_id", match.id);
      const taken = (fresh || match.players).reduce((sum: number, p: any) => sum + (p.number_of_slots || 1), 0);
      if (taken + slots > match.total_slots) {
        throw new Error(paid
          ? `The match filled up while you paid. Your payment is safe, contact support with reference ${ref} for a refund.`
          : `Only ${Math.max(0, match.total_slots - taken)} slot(s) are available.`);
      }

      const playerDetails: Record<string, any> = {};
      Object.keys(data).forEach((key) => {
        if (key !== "name") {
          playerDetails[key] = data[key];
        }
      });

      if (paid) {
        playerDetails.email = playerDetails.email || defaultEmail;
        playerDetails.payment_reference = ref;
        playerDetails.payment_status = "paid";
      }

      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          match_id: match.id,
          player_name: data.name,
          details: Object.keys(playerDetails).length > 0 ? playerDetails : undefined,
          payment_status: match.is_paid ? (paid ? "paid" : "pending") : "free",
          status: "registered",
          number_of_slots: slots,
          confirmation_code: confirmationCode,
        })
        .select("id, confirmation_code, number_of_slots")
        .single();

      if (playerError) throw playerError;
      notify("match_joined", { match_id: match.id, player_id: playerData.id });
      clearPending();

      if (userId) {
        const { error: joinError } = await supabase
          .from("user_joined_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
            player_id: playerData.id,
          });
        if (joinError) console.error("Could not link the match to the account", joinError);

        if (paid) {
          const { error: transactionError } = await supabase
            .from("user_transactions")
            .insert({
              user_id: userId,
              match_id: match.id,
              amount: match.price! * slots,
              transaction_type: "payment",
            });
          if (transactionError) console.error("Could not save the transaction record", transactionError);
        }
      }

      toast({
        title: "You're in",
        description: `You joined with ${slots} slot${slots > 1 ? "s" : ""}.`,
      });

      setPaymentStatus("pending");
      setPopupReference(null);
      // Drop the payment reference from the address so a refresh cannot reuse it
      if (urlReference) window.history.replaceState(null, "", window.location.pathname);
      showTicket(playerData.confirmation_code, playerData.number_of_slots || slots);

      const { data: updatedMatch } = await supabase
        .from("matches")
        .select(
          `
          id, slug, title, match_date, match_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
          is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
          is_recurring, recurring_frequency, recurring_occurrences,
          venue:venues(slug, name, city, image_urls),
          players(player_name, number_of_slots)
        `
        )
        .eq("slug", slug)
        .single();

      if (updatedMatch) {
        setMatch(updatedMatch as Match);
      }
    } catch (error: any) {
      console.error("Error joining match:", error);
      toast({
        title: "Could not join",
        description: error?.message && error.message.length < 160 ? error.message : "Failed to join the match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
      submitLock.current = false;
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  if (loading || verifyingPayment) {
    return <PageSkeleton />;
  }

  if (!match) return <NotFoundState kind="match" />;

  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
  const isFull = totalPlayerSlots >= match.total_slots;
  const maxSlots = Math.min(5, match.total_slots - totalPlayerSlots);
  // joining stays open while the match is live, until it ends
  const { isEnded: isPastMatch } = phase(matchWindow(match as any));

  return (
    <>
      <Seo
        title={match ? `Join ${match.title} | Match | Sport Cliq` : "Join Match | Sport Cliq"}
        description={match ? `Register for ${match.title} match on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech.` : "Register for a match on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."}
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-36 bg-sc-bg">
        <div className="relative h-[220px] overflow-hidden rounded-b-[36px]">
          <Cover src={(match as any).venue?.image_urls?.[0]} kind="football" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/25" />
          <div className="absolute left-5 right-5 flex justify-between items-center" style={{ top: "max(env(safe-area-inset-top), 1rem)" }}>
            <BackButton className="mt-3" />
            <span className="mt-3 h-8 px-3 rounded-full bg-white/90 text-sc-ink text-xs font-extrabold inline-flex items-center">Join match</span>
          </div>
          <div className="absolute left-5 right-5 bottom-5 text-white">
            <h1 className="m-0 text-[28px] leading-8 font-extrabold tracking-[-0.03em]">{match.title}</h1>
            {match.venue && <span className="text-sm opacity-90">{match.venue.name}, {match.venue.city}</span>}
          </div>
        </div>

        <div className="px-5 pt-[18px] flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Calendar, sport: "football" as const, label: "Date", value: new Date(match.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
              { icon: Clock, sport: "guide" as const, label: "Kickoff", value: formatTime(match.match_time) },
              { icon: Users, sport: "tennis" as const, label: "Spots left", value: `${Math.max(match.total_slots - totalPlayerSlots, 0)} of ${match.total_slots}` },
            ].map((f) => (
              <div key={f.label} className="min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-1.5">
                <Bubble icon={f.icon} sport={f.sport} size={32} />
                <span className="text-xs text-sc-ink3 font-semibold">{f.label}</span>
                <span className="text-[14px] font-extrabold truncate">{f.value}</span>
              </div>
            ))}
          </div>

          {userId && match.is_recurring && (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold inline-flex items-center gap-2" style={{ background: SPORT.cycling.bg, color: SPORT.cycling.fg }}>
              <Repeat size={16} /> Repeats {match.recurring_frequency} for {match.recurring_occurrences} times
            </div>
          )}

          {match.disclose_phone && match.organizer_phone && (
            <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
              <Avatar seed={match.organizer_name} initials={initialsOf(match.organizer_name || "O")} sport="pink" size={44} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs text-sc-ink3 font-semibold">Organiser</span>
                <span className="text-[15px] font-extrabold truncate">{match.organizer_name}</span>
              </span>
              <a href={`tel:${match.organizer_phone}`} aria-label="Call the organiser" className="w-11 h-11 rounded-full bg-sc-soft flex items-center justify-center"><Phone size={18} /></a>
              <a href={`https://wa.me/${match.organizer_phone}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp the organiser" className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center"><MessageSquare size={18} /></a>
            </div>
          )}

          {isPastMatch ? (
            <FunEmpty icon={Calendar} sport="football" title="This one has been played" body="The final whistle has gone on this match. Plenty more are kicking off soon." primary={{ label: "Find another match", onClick: () => navigate("/matches") }} />
          ) : isFull ? (
            <FunEmpty icon={Users} sport="red" title="Every slot is taken" body="This squad is complete. Check the match page in case a spot opens up." primary={{ label: "View match", onClick: () => navigate(`/match/${match.slug}`) }} secondary={{ label: "Find another match", onClick: () => navigate("/matches") }} />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white rounded-3xl p-[18px] flex flex-col gap-4">
                {match.is_paid && paymentStatus !== "success" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Bubble icon={Wallet} sport="money" size={44} radius={14} />
                      <span className="flex flex-col">
                        <span className="text-base font-extrabold">Pay to lock your slot</span>
                        <span className="text-[13px] text-sc-ink3">{formatNairaExact(match.price)} per slot, paid securely with Paystack</span>
                      </span>
                    </div>
                    {match.allow_bulk_tickets && maxSlots > 1 && (
                      <div className="flex items-center justify-between rounded-2xl bg-sc-bg px-4 py-3">
                        <span className="flex flex-col">
                          <span className="text-sm font-bold">Slots</span>
                          <span className="text-xs text-sc-ink3">Bring your friends, up to {maxSlots}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button type="button" aria-label="Fewer slots" onClick={() => setSelectedSlots((prev) => Math.max(1, prev - 1))} disabled={selectedSlots <= 1} className="w-10 h-10 rounded-full bg-white text-xl font-bold disabled:opacity-40">−</button>
                          <span className="w-6 text-center text-xl font-extrabold">{selectedSlots}</span>
                          <button type="button" aria-label="More slots" onClick={() => setSelectedSlots((prev) => Math.min(maxSlots, prev + 1))} disabled={selectedSlots >= maxSlots} className="w-10 h-10 rounded-full bg-white text-xl font-bold disabled:opacity-40">+</button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-sc-ink3 font-semibold">Total</span>
                      <span className="text-[26px] font-extrabold tracking-[-0.02em]">{formatNairaExact((match.price || 0) * selectedSlots)}</span>
                    </div>
                  </div>
                )}
                {match.is_paid && paymentStatus === "success" && (
                  <div className="rounded-2xl p-4 flex gap-3" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>
                    <CheckCircle2 size={22} className="shrink-0" />
                    <span className="flex flex-col text-sm">
                      <b>Payment received</b>
                      <span>Finish your details for {selectedSlots} slot{selectedSlots > 1 ? "s" : ""}.{paymentReference ? ` Ref ${paymentReference}` : ""}</span>
                    </span>
                  </div>
                )}
                <span className="text-base font-extrabold">Your details</span>
                {match.required_fields?.map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-sc-ink">{field === "phone" ? "Phone number" : field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={field === "phone" ? "11-digit phone number" : `Your ${field}`}
                            {...formField}
                            type={field === "phone" ? "tel" : "text"}
                            inputMode={field === "phone" ? "tel" : /age|number|jersey/i.test(field) ? "numeric" : "text"}
                            disabled={!!userId && (field === "name" || field === "phone")}
                            {...(field === "phone" && !userId && {
                              maxLength: 11,
                              onChange: (e: React.ChangeEvent<HTMLInputElement>) => formField.onChange(e.target.value.replace(/[^0-9]/g, "")),
                            })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                {match.is_paid && paymentStatus !== "success" ? (
                  <ScButton type="submit" icon={joining ? undefined : Wallet} disabled={joining || !paystackLoaded}>
                    {joining ? "Processing..." : !paystackLoaded ? "Getting payment ready..." : `Pay ${formatNairaExact((match.price || 0) * selectedSlots)}`}
                  </ScButton>
                ) : (
                  <ScButton type="submit" disabled={joining}>
                    {joining ? "Joining..." : `Join match${selectedSlots > 1 ? ` · ${selectedSlots} slots` : ""}`}
                  </ScButton>
                )}
                {match.is_paid && paymentStatus !== "success" && <p className="m-0 text-xs text-sc-ink3 text-center">You are registered as soon as the payment is confirmed.</p>}
              </form>
            </Form>
          )}
        </div>
        <Navbar />
        <MatchJoinersDialog
          open={successDialogOpen}
          onOpenChange={(open) => {
            setSuccessDialogOpen(open);
            if (!open) {
              form.reset();
              setPaymentStatus("pending");
              setSelectedSlots(1);
              // Back to the match, now showing this player in the squad
              navigate(`/match/${match.slug}`);
            }
          }}
          match={match}
          confirmationCode={confirmationCode}
          selectedSlots={bookedSlots}
          totalPlayerSlots={totalPlayerSlots}
        />
      </div>
    </>
  );
};

export default JoinMatch;
