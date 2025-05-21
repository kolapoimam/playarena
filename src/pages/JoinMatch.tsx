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

        const { verified, resource_id, slug: matchSlug, resource_type } = response.data;

        if (verified && resource_id === match.id && matchSlug === slug && resource_type === "match") {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your registration.",
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
    if (!match || !match.is_paid || !match.price || !paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Paystack is not available or match details are incomplete. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    if (!match.title || !defaultEmail) {
      console.error("Missing fields:", { title: match.title, email: defaultEmail });
      toast({
        title: "Error",
        description: "Missing match title or email. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setJoining(true);

      const amount = match.price * selectedSlots;
      const payload = {
        email: defaultEmail,
        amount: amount,
        match_id: match.id,
        slug: match.slug,
        name: match.title,
        number_of_slots: selectedSlots,
      };
      console.log("Payment Initiation Payload:", payload);

      const response = await supabase.functions.invoke("initialize-paystack-match", {
        body: payload,
      });

      if (response.error) {
        console.error("Edge Function Error:", response.error);
        throw new Error(response.error.message);
      }

      const { access_code, reference } = response.data;
      console.log("Paystack Response:", { access_code, reference });

      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: defaultEmail,
        amount: amount, // Amount in NGN, Edge Function handles kobo
        accessCode: access_code,
        onSuccess: (transaction) => {
          console.log("Paystack Transaction Success:", transaction);
          setPaymentStatus("success");
          toast({
            title: "Payment Successful",
            description: `Your payment for ${selectedSlots} slot(s) was processed successfully. Please complete your registration.`,
          });
          navigate(`/join/${match.slug}?reference=${transaction.reference}`);
          setJoining(false);
        },
        onCancel: () => {
          console.log("Paystack Transaction Cancelled");
          toast({
            title: "Payment Cancelled",
            description: "You've cancelled the payment process.",
            variant: "destructive",
          });
          setJoining(false);
        },
        onError: (error) => {
          console.error("Paystack Transaction Error:", error);
          toast({
            title: "Payment Error",
            description: `Failed to process payment: ${error.message || "Unknown error"}`,
            variant: "destructive",
          });
          setJoining(false);
        },
      });
    } catch (error: any) {
      console.error("Payment Initiation Error:", error.message, error.issues || []);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
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
          id, slug, title, match_date, match_time, total_slots, organizer_name, organizer_phone, disclose_phone, 
          is_paid, price, player_number_required, required_fields, allow_bulk_tickets,
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
        </div>

        {isPastMatch ? (
          <div className="text-center py-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">This match has already passed</h2>
            <p className="text-muted-foreground mt-2">You cannot join this match anymore.</p>
            <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white" onClick={() => navigate("/matches")}>
              Browse Other Matches
            </Button>
          </div>
        ) : isFull ? (
          <div className="text-center py-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">This match is full</h2>
            <p className="text-muted-foreground mt-2">All player slots have been filled.</p>
            <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white" onClick={() => navigate(`/match/${match.slug}`)}>
              View Match Details
            </Button>
          </div>
        ) : (
          <>
            {match.is_paid && paymentStatus === "pending" ? (
              <div className="bg-card rounded-lg shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Payment Required</h3>
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
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card rounded-lg shadow-md p-6">
                  {match.is_paid && paymentStatus === "success" && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-700">
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
                          <FormLabel className="text-gray-700">{field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Enter your ${field}`}
                              {...formField}
                              type={field === "phone" ? "tel" : "text"}
                              inputMode={field === "phone" ? "numeric" : "text"}
                              className="border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                              {...(field === "phone" && {
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
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
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

      <Dialog open={successDialogOpen} onOpenChange={(open) => {
        setSuccessDialogOpen(open);
        setIsImageLoaded(false);
        if (!open) setBackgroundOption("field");
      }}>
        <DialogContent className="sm:max-w-[425px] max-w-[90vw] rounded-2xl">
          <DialogTitle>Registration Successful</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have successfully registered for the match for {selectedSlots} slot{selectedSlots > 1 ? "s" : ""}.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Background:</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="field"
                    checked={backgroundOption === "field"}
                    onChange={() => setBackgroundOption("field")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Default</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="white"
                    checked={backgroundOption === "white"}
                    onChange={() => setBackgroundOption("white")}
                    className="form-radio text-playarena-500"
                  />
                  <span>White</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="green"
                    checked={backgroundOption === "green"}
                    onChange={() => setBackgroundOption("green")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Green</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="black"
                    checked={backgroundOption === "black"}
                    onChange={() => setBackgroundOption("black")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Black</span>
                </label>
              </div>
            </div>
            <div 
              ref={cardRef}
              className={`rounded-lg p-6 shadow-lg relative overflow-hidden ${backgroundOption === "field" ? "bg-cover bg-center" : ""}`}
              style={{
                backgroundImage: backgroundOption === "field" ? "url('/football-field.jpg')" : "",
                backgroundColor: backgroundOption !== "field" ? backgroundOption : "transparent",
                ...(backgroundOption === "field" && {
                  backgroundBlendMode: "overlay",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                }),
              }}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <img 
                      src={backgroundOption === "white" ? "/playarenalight.png" : "/playarenadark.png"}
                      alt="PlayArena Logo" 
                      className="h-8 w-auto"
                      onLoad={handleImageLoad}
                      onError={() => {
                        toast({
                          title: "Error",
                          description: "Failed to load logo image.",
                          variant: "destructive",
                        });
                        setIsImageLoaded(true);
                      }}
                    />
                    <Trophy className={`h-6 w-6 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                  </div>
                  <h2 className={`text-xl font-bold mb-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match?.title}</h2>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center">
                      <MapPin className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                      <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match?.venue?.name || "Venue"}, {match?.venue?.city || ""}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                      <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match && formatDate(match.match_date)} at {match && formatTime(match.match_time)}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                      <span className={backgroundOption === "white" ? "text-black" : "text-white"}>
                        {match?.is_paid ? `Paid (₦${match?.price?.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x${selectedSlots})` : "Free"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                      <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{totalPlayerSlots}/{match?.total_slots} slots booked</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`font-bold ${backgroundOption === "white" ? "text-black" : "text-white"}`}>Confirmation Code:</span>
                      <span className={`ml-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{confirmationCode}</span>
                    </div>
                    {selectedSlots > 1 && (
                      <div className="flex items-center">
                        <span className={`font-bold ${backgroundOption === "white" ? "text-black" : "text-white"}`}>Slots Registered:</span>
                        <span className={`ml-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{selectedSlots}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
                <strong>Note:</strong> Save this card to present your confirmation code at check-in.
              </p>
              <div className="flex gap-2">
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleDownload}
                  disabled={!isImageLoaded}
                >
                  Download
                </Button>
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => {
                    setSuccessDialogOpen(false);
                    navigate(`/match/${match.slug}`);
                  }}
                >
                  Close
                </Button>
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    );
};

export default JoinMatch;
