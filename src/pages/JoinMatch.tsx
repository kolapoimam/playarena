import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format, isToday, isPast } from "date-fns";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  total_slots: number;
  organizer_name: string;
  is_paid: boolean;
  price: number | null;
  player_number_required: boolean;
  required_fields: string[] | null;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

type PaymentStatus = "pending" | "success" | "failed";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

const JoinMatch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [phone, setPhone] = useState("");
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  // Log search params
  useEffect(() => {
    console.log("Search params:", Object.fromEntries(searchParams), "Reference:", reference);
  }, [searchParams, reference]);

  // Restore reference from localStorage if missing
  useEffect(() => {
    const storedReference = localStorage.getItem("paymentReference");
    if (storedReference && !reference && slug) {
      console.log("Restoring reference from localStorage:", storedReference);
      navigate(`/join-match/${slug}?reference=${storedReference}`, { replace: true });
    }
  }, [reference, slug, navigate]);

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => {
      console.log("Paystack script loaded");
      setPaystackLoaded(true);
    };
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

  // Form schema
  const createFormSchema = (requiredFields: string[] = ["name", "phone"]) => {
    const schemaFields: Record<string, z.ZodType> = {};
    requiredFields.forEach((field) => {
      if (field === "phone") {
        schemaFields[field] = z
          .string()
          .regex(/^\d{11}$/, {
            message: "Phone number must be exactly 11 digits (e.g., 08012345678)",
          });
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

  // Fetch match details
  useEffect(() => {
    if (!slug) return;

    const fetchMatch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            id, slug, title, match_date, match_time, total_slots, organizer_name, 
            is_paid, price, player_number_required, required_fields,
            venue:venues(slug, name, city),
            players(*)
          `
          )
          .eq("slug", slug)
          .single();

        if (error) throw error;

        console.log("Fetched match:", data);

        const requiredFields = Array.isArray(data?.required_fields)
          ? data.required_fields
          : ["name", "phone"];
        setFormSchema(createFormSchema(requiredFields));

        const defaultValues: Record<string, string> = {};
        requiredFields.forEach((field) => {
          defaultValues[field] = "";
        });
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
  }, [slug, toast, form]);

  // Verify payment
  useEffect(() => {
    if (!reference || !match || loading) {
      console.log("Skipping payment verification: incomplete data", { reference, match, loading });
      return;
    }

    const verifyPayment = async () => {
      setVerifyingPayment(true);
      try {
        console.log("Calling verify-paystack-transaction with reference:", reference);
        const response = await supabase.functions.invoke("verify-paystack-transaction", {
          body: { reference },
        });

        console.log("Edge Function response:", response);

        if (response.error) {
          throw new Error(response.error.message || "Unknown error in verify-paystack-transaction");
        }

        const { verified, match_id, slug: matchSlug, phone: verifiedPhone } = response.data;
        console.log("Parsed response data:", { verified, match_id, matchSlug, verifiedPhone });

        if (verified && match_id === match.id && matchSlug === slug) {
          console.log("Verification successful");
          setPaymentStatus("success");
          if (verifiedPhone) {
            setPhone(verifiedPhone);
            form.setValue("phone", verifiedPhone);
          }
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Please complete your registration.",
          });
        } else {
          console.log("Verification failed", {
            verified,
            match_id,
            matchSlug,
            expectedMatchId: match.id,
            expectedSlug: slug,
          });
          setPaymentStatus("failed");
          toast({
            title: "Payment Verification Failed",
            description: "We could not verify your payment. Please try again or contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setPaymentStatus("failed");
        toast({
          title: "Payment Verification Error",
          description: "An error occurred while verifying your payment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setVerifyingPayment(false);
        setJoining(false);
      }
    };

    verifyPayment();
  }, [reference, match, loading, slug, toast, form]);

  // Log paymentStatus changes
  useEffect(() => {
    console.log("paymentStatus updated:", paymentStatus);
  }, [paymentStatus]);

  const handlePaymentInitiation = async () => {
    if (!match || !match.is_paid || !match.price) {
      console.log("Cannot initiate payment: invalid match data", { match });
      return;
    }

    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 11-digit Nigerian phone number (e.g., 08012345678).",
        variant: "destructive",
      });
      return;
    }

    if (!paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Paystack is not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      toast({
        title: "Configuration Error",
        description: "Paystack configuration is missing. Please contact support.",
        variant: "destructive",
      });
      console.error("Paystack public key is missing");
      return;
    }

    try {
      setJoining(true);

      const placeholderEmail = `+234${phone}@example.com`;
      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          phone,
          email: placeholderEmail,
          amount: match.price,
          match_id: match.id,
          slug: match.slug,
          title: match.title,
        },
      });

      console.log("Initialize payment response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Failed to initialize payment");
      }

      const { reference: txReference } = response.data;
      console.log("Paystack transaction data:", { txReference });

      localStorage.setItem("paymentReference", txReference);

      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: placeholderEmail,
        amount: match.price * 100,
        reference: txReference,
        callback: (transaction) => {
          console.log("Paystack callback:", transaction);
          if (transaction.status === "success") {
            navigate(`/join-match/${slug}?reference=${transaction.reference}`, { replace: true });
          }
          setJoining(false);
        },
        onClose: () => {
          console.log("Paystack payment closed");
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

    if (match.players.length >= match.total_slots) {
      toast({
        title: "Match is full",
        description: "Sorry, this match has reached its player limit.",
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
        playerDetails.phone = phone;
        playerDetails.payment_status = "paid";
      }

      const { error } = await supabase.from("players").insert({
        match_id: match.id,
        player_name: data.name,
        details: Object.keys(playerDetails).length > 0 ? playerDetails : undefined,
        payment_status: match.is_paid ? (paymentStatus === "success" ? "paid" : "pending") : "free",
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You have joined the match successfully.",
      });

      form.reset();
      if (match.is_paid) {
        setPaymentStatus("pending");
        setPhone("");
        localStorage.removeItem("paymentReference");
      }

      const { data: updatedMatch } = await supabase
        .from("matches")
        .select(
          `
          id, slug, title, match_date, match_time, total_slots, organizer_name, 
          is_paid, price, player_number_required, required_fields,
          venue:venues(slug, name, city),
          players(*)
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
      setJoining(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
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

  const isFull = match.players.length >= match.total_slots;
  const matchDate = new Date(`${match.match_date}T00:00:00`);
  const isPastMatch = isPast(matchDate) && !isToday(matchDate);

  console.log("Rendering form:", { isPaid: match.is_paid, paymentStatus });

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-2">Join Match</h1>
        <div className="mb-6">
          <h2 className="font-semibold text-xl">{match.title}</h2>
          <p className="text-muted-foreground">
            {formatDate(match.match_date)} · {match.venue?.name}, {match.venue?.city}
          </p>
          <p className="mt-2">
            Spots available: {match.total_slots - match.players.length} / {match.total_slots}
          </p>
          {match.is_paid && (
            <p className="font-medium mt-2">Price: ₦{match.price?.toFixed(2)}</p>
          )}
        </div>

        {isPastMatch ? (
          <div className="text-center py-6 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold">This match has already passed</h2>
            <p className="text-muted-foreground mt-2">You cannot join this match anymore.</p>
            <Button className="mt-4" onClick={() => navigate("/matches")}>
              Browse Other Matches
            </Button>
          </div>
        ) : isFull ? (
          <div className="text-center py-6 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold">This match is full</h2>
            <p className="text-muted-foreground mt-2">All player slots have been filled.</p>
            <Button className="mt-4" onClick={() => navigate(`/match/${match.slug}`)}>
              View Match Details
            </Button>
          </div>
        ) : (
          <>
            {match.is_paid && paymentStatus !== "success" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Required</h3>
                <p className="text-muted-foreground mb-4">
                  This is a paid match. Please complete the payment to join.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-medium">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your payment receipt will be sent to this phone number.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                    onClick={handlePaymentInitiation}
                    disabled={joining || !phone || !paystackLoaded}
                  >
                    {joining ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay Now (₦${match.price?.toFixed(2)})`
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form} key={paymentStatus}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {match.required_fields?.map((field) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={field}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Enter your ${field}`}
                              {...formField}
                              type={field === "phone" ? "tel" : "text"}
                              inputMode={field === "phone" ? "numeric" : "text"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="submit"
                    className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                    disabled={joining}
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
                </form>
              </Form>
            )}
          </>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default JoinMatch;