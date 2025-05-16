import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader, Calendar, MapPin, Clock, Users, DollarSign, Trophy, Phone, MessageSquare } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format, isToday, isPast } from "date-fns";
import html2canvas from "html2canvas";
import { DateTime } from "luxon";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  start_time: string;
  end_time: string;
  total_slots: number;
  organizer_name: string;
  organizer_phone: string | null;
  disclose_phone: boolean;
  is_paid: boolean;
  price: number | null;
  player_number_required: boolean;
  required_fields: string[] | null;
  allow_bulk_tickets: boolean;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
    number_of_slots: number;
  }[];
  organizer_id: string;
};

type Organizer = {
  id: string;
  name: string;
  phone: string;
  is_verified: boolean;
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
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundOption, setBackgroundOption] = useState("field");
  const [selectedSlots, setSelectedSlots] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const defaultEmail = "kolapoimam1@gmail.com";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
    fetchOrganizers();
  }, []);

  useEffect(() => {
    fetchOrganizers();
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

  const fetchOrganizers = async () => {
    try {
      const { data, error } = await supabase
        .from("organizers")
        .select("id, name, phone, is_verified")
        .order("name", { ascending: true });

      if (error) throw error;
      setOrganizers(data as Organizer[]);
    } catch (error: any) {
      console.error("Error fetching organizers:", error.message);
      toast({
        title: "Error",
        description: "Failed to load organizers. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  useEffect(() => {
    if (!slug) return;

    const fetchMatch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            id, slug, title, match_date, match_time, start_time, end_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
            is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
            venue:venues(slug, name, city),
            players(player_name, number_of_slots),
            organizer_id
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

        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, phone_number")
            .eq("id", userId)
            .single();
          if (profile) {
            defaultValues["name"] = profile.nickname || "";
            defaultValues["phone"] = profile.phone_number || "";
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

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({
        title: "Error",
        description: "Card is not ready for download. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const link = document.createElement('a');
      link.download = `PlayArena-Registration-${match?.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download registration card. Please try again.",
        variant: "destructive",
      });
    }
  }, [isImageLoaded, match, toast]);

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

    const now = DateTime.now().setZone("Africa/Lagos");
    const endDateTime = DateTime.fromISO(`${match.match_date}T${match.end_time}`, { zone: "utc" }).setZone("Africa/Lagos");
    if (now > endDateTime) {
      toast({
        title: "Match Joining Period Ended",
        description: "You cannot join this match after its end time.",
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
      setSuccessDialogOpen(true);

      const { data: updatedMatch } = await supabase
        .from("matches")
        .select(
          `
          id, slug, title, match_date, match_time, start_time, end_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
          is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
          venue:venues(slug, name, city),
          players(player_name, number_of_slots),
          organizer_id
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
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
  const now = DateTime.now().setZone("Africa/Lagos");
  const endDateTime = DateTime.fromISO(`${match.match_date}T${match.end_time}`, { zone: "utc" }).setZone("Africa/Lagos");
  const canJoin = now <= endDateTime && !isPastMatch && !isFull;

  const organizer = organizers.find(org => org.id === match.organizer_id);
  const isVerified = organizer?.is_verified || false;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Join Match</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6">
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
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
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} />
            <span>Spots available: {match.total_slots - totalPlayerSlots} / {match.total_slots}</span>
          </div>
          {match.is_paid && (
            <div className="mt-2 font-medium text-green-600">Price: ₦{match.price?.toFixed(2)} per slot</div>
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
                className="flex items-center text-green-600 hover:underline"
              >
                <MessageSquare size={16} className="mr-1" />
                WhatsApp
              </a>
            </div>
          )}
          <p className="mt-2 text-sm text-gray-600 flex items-center">
            Organized by: {match.organizer_name}
            {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
          </p>
        </div>

        {isPastMatch ? (
          <div className="text-center py-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">This match has already passed</h2>
            <p className="text-muted-foreground mt-2">
              You can no longer join this match as it has already taken place.
            </p>
            <Button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => navigate("/matches")}
            >
              Find Another Match
            </Button>
          </div>
        ) : isFull ? (
          <div className="text-center py-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">Match is Full</h2>
            <p className="text-muted-foreground mt-2">
              All slots for this match have been filled.
            </p>
            <Button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => navigate("/matches")}
            >
              Find Another Match
            </Button>
          </div>
        ) : !canJoin ? (
          <div className="text-center py-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">Joining Period Ended</h2>
            <p className="text-muted-foreground mt-2">
              You cannot join this match after its end time.
            </p>
            <Button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => navigate("/matches")}
            >
              Find Another Match
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Trophy size={20} className="mr-2 text-green-500" />
              Register for the Match
            </h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {Object.keys(formSchema.shape).map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="capitalize">{field}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`Enter your ${field}`}
                            {...formField}
                            className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                {match.allow_bulk_tickets && maxSlots > 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Number of Slots
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedSlots((prev) => Math.max(1, prev - 1))}
                        disabled={selectedSlots <= 1}
                      >
                        -
                      </Button>
                      <span className="text-lg font-medium">{selectedSlots}</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedSlots((prev) => Math.min(maxSlots, prev + 1))}
                        disabled={selectedSlots >= maxSlots}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {match.is_paid && match.price
                        ? `Total: ₦${(match.price * selectedSlots).toFixed(2)}`
                        : `Selecting ${selectedSlots} slot${selectedSlots > 1 ? "s" : ""}`}
                    </p>
                  </div>
                )}

                {match.is_paid && paymentStatus !== "success" ? (
                  <Button
                    type="button"
                    onClick={handlePaymentInitiation}
                    disabled={joining || !paystackLoaded}
                    className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
                  >
                    {joining ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <DollarSign size={16} className="mr-2" />
                        Pay ₦{(match.price! * selectedSlots).toFixed(2)} to Join
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={joining || (match.is_paid && paymentStatus !== "success")}
                    className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
                  >
                    {joining ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Match"
                    )}
                  </Button>
                )}
              </form>
            </Form>
          </div>
        )}

        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Registration Successful!
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              <p>You've successfully joined the match. Here are your details:</p>
              <div className="mt-4">
                <div
                  ref={cardRef}
                  className={`relative p-6 rounded-lg shadow-md text-white ${
                    backgroundOption === "field"
                      ? "bg-field-pattern"
                      : backgroundOption === "stadium"
                      ? "bg-stadium-pattern"
                      : "bg-gradient-to-br from-green-500 to-green-700"
                  } overflow-hidden`}
                >
                  <img
                    src={
                      backgroundOption === "field"
                        ? "/field-pattern.jpg"
                        : backgroundOption === "stadium"
                        ? "/stadium-pattern.jpg"
                        : undefined
                    }
                    alt="background"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                    onLoad={handleImageLoad}
                    onError={() => setIsImageLoaded(false)}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{match.title}</h3>
                      <img src="/logo.png" alt="PlayArena Logo" className="h-8" onLoad={handleImageLoad} />
                    </div>
                    <p className="mt-2 text-sm">
                      <strong>Confirmation Code:</strong> {confirmationCode}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong> {formatDate(match.match_date)}
                    </p>
                    <p className="text-sm">
                      <strong>Time:</strong> {formatTime(match.match_time)}
                    </p>
                    <p className="text-sm">
                      <strong>Venue:</strong> {match.venue?.name}, {match.venue?.city}
                    </p>
                    <p className="text-sm">
                      <strong>Slots:</strong> {selectedSlots}
                    </p>
                    {match.is_paid && (
                      <p className="text-sm">
                        <strong>Amount Paid:</strong> ₦{(match.price! * selectedSlots).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Background
                  </label>
                  <select
                    value={backgroundOption}
                    onChange={(e) => setBackgroundOption(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="field">Field Pattern</option>
                    <option value="stadium">Stadium Pattern</option>
                    <option value="gradient">Green Gradient</option>
                  </select>
                </div>
                <Button
                  onClick={handleDownload}
                  disabled={!isImageLoaded}
                  className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Download Registration Card
                </Button>
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>

      <Navbar />
    </div>
  );
};

export default JoinMatch;
