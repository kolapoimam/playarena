// src/pages/JoinMatch.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
const FIXED_EMAIL = "kolapoimam1@gmail.com";

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
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  useEffect(() => {
    console.log("JoinMatch rendered", { slug, reference, paymentStatus });
  }, [slug, reference, paymentStatus]);

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
        description: "Failed to load Paystack script.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

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
          description: "Failed to load match details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [slug, toast, form]);

  useEffect(() => {
    if (!reference || !match) {
      console.log("Skipping verification", { reference, match });
      return;
    }

    const verifyPayment = async () => {
      setVerifyingPayment(true);
      try {
        console.log("Verifying payment", { reference, matchId: match.id, slug });
        const response = await supabase.functions.invoke("verify-paystack-transaction", {
          body: { reference },
        });

        console.log("Verify response:", JSON.stringify(response, null, 2));

        if (response.error) {
          throw new Error(response.error.message || "Verification failed");
        }

        const { verified, match_id, slug: matchSlug, phone: verifiedPhone } = response.data;
        console.log("Verification data:", { verified, match_id, matchSlug, verifiedPhone });

        if (verified && match_id === match.id && matchSlug === slug) {
          setPaymentStatus("success");
          if (verifiedPhone) {
            form.setValue("phone", verifiedPhone);
          }
          toast({
            title: "Payment Successful",
            description: "Please complete your registration.",
          });
        } else {
          setPaymentStatus("failed");
          toast({
            title: "Verification Failed",
            description: "Payment could not be verified.",
            variant: "destructive",
          });
          console.log("Verification mismatch", { match_id, matchId: match.id, matchSlug, slug });
        }
      } catch (error) {
        console.error("Verification error:", error);
        setPaymentStatus("failed");
        toast({
          title: "Verification Error",
          description: "Error verifying payment.",
          variant: "destructive",
        });
      } finally {
        setVerifyingPayment(false);
        setJoining(false);
        console.log("Verification complete", { paymentStatus });
      }
    };

    verifyPayment();
  }, [reference, match, slug, toast, form]);

  const handlePaymentInitiation = async () => {
    if (!match || !match.is_paid || !match.price) {
      console.log("Invalid payment data", { match });
      return;
    }

    if (!paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Paystack not available.",
        variant: "destructive",
      });
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      toast({
        title: "Configuration Error",
        description: "Paystack configuration missing.",
        variant: "destructive",
      });
      console.error("Paystack public key missing");
      return;
    }

    try {
      setJoining(true);

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: FIXED_EMAIL,
          amount: match.price,
          match_id: match.id,
          slug: match.slug,
          title: match.title,
        },
      });

      console.log("Initialize response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Failed to initialize payment");
      }

      const { reference: txReference } = response.data;
      console.log("Transaction data:", { txReference });

      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: FIXED_EMAIL,
        amount: match.price * 100,
        reference: txReference,
        callback: (transaction) => {
          console.log("Paystack callback:", transaction);
          setJoining(false);
        },
        onClose: () => {
          console.log("Paystack closed");
          toast({
            title: "Payment Cancelled",
            description: "Payment process cancelled.",
            variant: "destructive",
          });
          setJoining(false);
        },
      });
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment.",
        variant: "destructive",
      });
      setJoining(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!match || !slug) return;

    if (match.players.length >= match.total_slots) {
      toast({
        title: "Match Full",
        description: "This match has reached its player limit.",
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
        title: "Success",
        description: "You have joined the match.",
      });

      form.reset();
      if (match.is_paid) {
        setPaymentStatus("pending");
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
      console.error("Join error:", error);
      toast({
        title: "Error",
        description: "Failed to join match.",
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
          <p className="text-muted-foreground">The match doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isFull = match.players.length >= match.total_slots;
  const matchDate = new Date(`${match.match_date}T00:00:00`);
  const isPastMatch = isPast(matchDate) && !isToday(matchDate);

  console.log("Render", { is_paid: match.is_paid, paymentStatus });

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
            <h2 className="text-lg font-semibold">Match Passed</h2>
            <p className="text-muted-foreground mt-2">You cannot join this match anymore.</p>
            <Button className="mt-4" onClick={() => navigate("/matches")}>
              Browse Matches
            </Button>
          </div>
        ) : isFull ? (
          <div className="text-center py-6 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold">Match Full</h2>
            <p className="text-muted-foreground mt-2">All slots filled.</p>
            <Button className="mt-4" onClick={() => navigate(`/match/${match.slug}`)}>
              View Details
            </Button>
          </div>
        ) : (
          <>
            {match.is_paid && paymentStatus === "pending" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Required</h3>
                <p className="text-muted-foreground mb-4">
                  Complete payment to join.
                </p>
                <Button
                  type="button"
                  className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                  onClick={handlePaymentInitiation}
                  disabled={joining || !paystackLoaded}
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
            ) : (
              <Form {...form}>
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
