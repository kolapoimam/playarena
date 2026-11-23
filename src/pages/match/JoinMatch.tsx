import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader, Calendar, MapPin, Clock, Users, DollarSign, Phone, MessageSquare, Repeat } from "lucide-react";
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

import { BackButton } from "@/components/sc/ui";
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
  
  const paymentReference = reference || trxref;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const defaultEmail = "payments@sportcliq.com";

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
            venue:venues(slug, name, city),
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

  useEffect(() => {
    if (!paymentReference || !match) return;

    const verifyPayment = async () => {
      setVerifyingPayment(true);
      try {
        const response = await supabase.functions.invoke("verify-paystack-transaction", {
          body: { reference: paymentReference },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const { verified, match_id, slug: matchSlug } = response.data;

        if (verified && match_id === match.id && matchSlug === slug) {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your registration. Do not close this page",
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
  }, [paymentReference, match, slug, toast]);

  const handlePaymentInitiation = async () => {
    if (!match || !match.is_paid || !match.price) return;

    if (!paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Paystack is not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setJoining(true);

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: defaultEmail,
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
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: `Your payment for ${selectedSlots} slot(s) was processed successfully. Please complete your registration.`,
          });
          setJoining(false);
        },
        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You've cancelled the payment process.",
            variant: "destructive",
          });
          setJoining(false);
        },
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setJoining(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!match || !slug) return;

    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    if (totalPlayerSlots + selectedSlots > match.total_slots) {
      toast({
        title: "Not enough slots",
        description: `Only ${match.total_slots - totalPlayerSlots} slot(s) are available.`,
        variant: "destructive",
      });
      return;
    }

    setJoining(true);

    try {
      const playerDetails: Record<string, any> = {};
      Object.keys(data).forEach((key) => {
        if (key !== "name") {
          playerDetails[key] = data[key];
        }
      });

      if (match.is_paid && paymentStatus === "success") {
        playerDetails.email = defaultEmail;
        playerDetails.payment_reference = paymentReference;
        playerDetails.payment_status = "paid";
      }

      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          match_id: match.id,
          player_name: data.name,
          details: Object.keys(playerDetails).length > 0 ? playerDetails : undefined,
          payment_status: match.is_paid ? (paymentStatus === "success" ? "paid" : "pending") : "free",
          status: "registered",
          number_of_slots: selectedSlots,
          confirmation_code: confirmationCode,
        })
        .select("id, confirmation_code")
        .single();

      if (playerError) throw playerError;

      if (userId) {
        const { error: joinError } = await supabase
          .from("user_joined_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
            player_id: playerData.id,
          });

        if (joinError) throw joinError;

        if (match.is_paid && paymentStatus === "success") {
          const { error: transactionError } = await supabase
            .from("user_transactions")
            .insert({
              user_id: userId,
              match_id: match.id,
              amount: match.price! * selectedSlots,
              transaction_type: "payment",
            });

          if (transactionError) throw transactionError;
        }
      }

      setConfirmationCode(playerData.confirmation_code);

      toast({
        title: "Success!",
        description: `You have joined the match successfully for ${selectedSlots} slot${selectedSlots > 1 ? "s" : ""}.`,
      });

      form.reset();
      setPaymentStatus("pending");
      setSelectedSlots(1);
      // Ensure match and confirmationCode are set before opening dialog
      if (match && playerData.confirmation_code) {
        setSuccessDialogOpen(true);
      } else {
        console.error('Failed to open dialog: match or confirmationCode missing', { match, confirmationCode: playerData.confirmation_code });
        toast({
          title: "Error",
          description: "Failed to display registration confirmation. Please try again.",
          variant: "destructive",
        });
      }
      
      const { data: updatedMatch } = await supabase
        .from("matches")
        .select(
          `
          id, slug, title, match_date, match_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
          is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
          is_recurring, recurring_frequency, recurring_occurrences,
          venue:venues(slug, name, city),
          players(player_name, number_of_slots)
        `
        )
        .eq("slug", slug)
        .single();

      if (updatedMatch) {
        setMatch(updatedMatch as Match);
      }
      
    } catch (error) {
      console.error("Error joining match:", error);
      toast({
        title: "Error",
        description: "Failed to join the match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
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
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sc-green"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
          <p className="text-muted-foreground">The match you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
  const isFull = totalPlayerSlots >= match.total_slots;
  const maxSlots = Math.min(5, match.total_slots - totalPlayerSlots);
  const matchDate = new Date(`${match.match_date}T00:00:00`);
  const isPastMatch = isPast(matchDate) && !isToday(matchDate);

  return (
    <>
      <Seo
        title={match ? `Join ${match.title} | Match | Sport Cliq` : "Join Match | Sport Cliq"}
        description={match ? `Register for ${match.title} match on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech.` : "Register for a match on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."}
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-32">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Join match</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

        <div className="p-6">
          <div className="bg-card rounded-lg shadow-card p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">{match.title}</h2>
            <div className="text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(match.match_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatTime(match.match_time)}</span>
              </div>
              {match.venue && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{match.venue.name}, {match.venue.city}</span>
                </div>
              )}
              {userId && match.is_recurring && (
                <div className="flex items-center gap-2">
                  <Repeat size={16} />
                  <span>Repeats {match.recurring_frequency} for {match.recurring_occurrences} times</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} />
              <span>Spots available: {match.total_slots - totalPlayerSlots} / {match.total_slots}</span>
            </div>
            {match.is_paid && (
              <div className="mt-2 font-medium text-sc-green-dark">Price: ₦{match.price?.toFixed(2)} per slot</div>
            )}
            {match.disclose_phone && match.organizer_phone && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span>Organizer:</span>
                <a href={`tel:${match.organizer_phone}`} className="flex items-center text-blue-600 hover:underline">
                  <Phone size={16} className="mr-1" />
                  Call Organizer
                </a>
                <a
                  href={`https://wa.me/${match.organizer_phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sc-green-dark hover:underline"
                >
                  <MessageSquare size={16} className="mr-1" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>

          {isPastMatch ? (
            <div className="text-center py-6 bg-muted rounded-lg shadow-card">
              <h2 className="text-lg font-semibold text-sc-ink2">This match has already passed</h2>
              <p className="text-muted-foreground mt-2">You cannot join this match anymore.</p>
              <Button className="mt-4 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold" onClick={() => navigate("/matches")}>
                Browse Other Matches
              </Button>
            </div>
          ) : isFull ? (
            <div className="text-center py-6 bg-muted rounded-lg shadow-card">
              <h2 className="text-lg font-semibold text-sc-ink2">This match is full</h2>
              <p className="text-muted-foreground mt-2">All player slots have been filled.</p>
              <Button className="mt-4 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold" onClick={() => navigate(`/match/${match.slug}`)}>
                View Match Details
              </Button>
            </div>
          ) : (
            <>
              {match.is_paid && paymentStatus === "pending" ? (
                <div className="bg-card rounded-lg shadow-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-sc-ink">Payment Required</h3>
                  <p className="text-muted-foreground">
                    This is a paid match. Please complete the payment to join.
                  </p>
                  {match.allow_bulk_tickets && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Number of Slots:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSlots((prev) => Math.max(1, prev - 1))}
                          disabled={selectedSlots <= 1}
                        >
                          -
                        </Button>
                        <span className="text-lg font-medium">{selectedSlots}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSlots((prev) => Math.min(maxSlots, prev + 1))}
                          disabled={selectedSlots >= maxSlots}
                        >
                          +
                        </Button>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Max {maxSlots} slots available
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-medium">
                    Total: ₦{(match.price! * selectedSlots).toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink py-2 rounded-full transition-colors font-bold"
                    onClick={handlePaymentInitiation}
                    disabled={joining || !paystackLoaded}
                  >
                    {joining ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay Now (₦${(match.price! * selectedSlots).toFixed(2)})`
                    )}
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card rounded-lg shadow-card p-6">
                    {match.is_paid && paymentStatus === "success" && (
                      <div className="bg-sc-green-bg p-4 rounded-md border border-green-200 text-sc-green-dark">
                        <p className="font-medium">Payment Successful!</p>
                        <p className="text-sm">Please complete your registration below for {selectedSlots} slot{selectedSlots > 1 ? "s" : ""}.</p>
                        {paymentReference && (
                          <p className="text-sm mt-1">Reference: {paymentReference}</p>
                        )}
                      </div>
                    )}
                    
                    {match.required_fields?.map((field) => (
                      <FormField
                        key={field}
                        control={form.control}
                        name={field}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel className="text-sc-ink2">{field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={`Enter your ${field}`}
                                {...formField}
                                type={field === "phone" ? "tel" : "text"}
                                inputMode={field === "phone" ? "numeric" : "text"}
                                className="border-sc-line rounded-md focus:ring-green-500 focus:border-green-500"
                                disabled={userId && (field === "name" || field === "phone")}
                                {...(field === "phone" && !userId && {
                                  pattern: "[0-9]*",
                                  maxLength: 11,
                                  onChange: (e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    formField.onChange(value);
                                  },
                                })}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                    ))}

                    <Button
                      type="submit"
                      className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink py-2 rounded-full transition-colors font-bold"
                      disabled={joining}
                    >
                      {joining ? (
                        <>
                          <Loader size={16} className="mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        `Join Match${selectedSlots > 1 ? ` (${selectedSlots} slots)` : ""}`
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </>
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
            }
          }}
          match={match}
          confirmationCode={confirmationCode}
          selectedSlots={selectedSlots}
          totalPlayerSlots={totalPlayerSlots}
        />
      </div>
    </>
  );
};

export default JoinMatch;
