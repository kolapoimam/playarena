import { useState, useEffect } from "react";
import { NotFoundState } from "@/components/sc/FunState";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar, MapPin, ArrowLeft, Ticket } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import TicketReceipt from "@/components/gameManagement/TicketReceipt";
import { Seo } from "@/components/Seo";

import { BackButton } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  ticket_price: number | null;
  max_tickets: number | null;
  sell_tickets: boolean;
  venue: {
    name: string;
    city: string;
  } | null;
  tickets: {
    number_of_tickets: number;
  }[];
};

const formSchema = z.object({
  buyer_name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  buyer_phone: z
    .string()
    .regex(/^[0-9]+$/, { message: "Must contain only numbers" })
    .length(11, { message: "Must be exactly 11 digits" }),
  number_of_tickets: z
    .number()
    .int({ message: "Must be a whole number" })
    .min(1, { message: "At least 1 ticket is required" })
    .max(10, { message: "Maximum 10 tickets per purchase" }),
});

type FormValues = z.infer<typeof formSchema>;

const Ticketing = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<number | null>(null);
  const defaultEmail = "sportcliqapp@gmail.com";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyer_name: "",
      buyer_phone: "",
      number_of_tickets: 1,
    },
  });

  // Load Paystack script
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

  // Fetch match details
  useEffect(() => {
    if (!slug) {
      toast({
        title: "Error",
        description: "Invalid match URL.",
        variant: "destructive",
      });
      navigate("/matches");
      return;
    }
    fetchMatch(slug);
  }, [slug, toast, navigate]);

  const fetchMatch = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, ticket_price, max_tickets, sell_tickets,
          venue:venues(name, city),
          tickets(number_of_tickets)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      const matchData = data as Match;
      if (!matchData.sell_tickets) {
        toast({
          title: "Error",
          description: "Tickets are not available for this match.",
          variant: "destructive",
        });
        navigate(`/match/${matchSlug}`);
        return;
      }

      // Check if tickets can still be purchased
      const matchDateTime = new Date(`${matchData.match_date}T${matchData.match_time}`);
      const now = new Date(); // Current date and time: 05:14 PM WAT, May 27, 2025
      const thirtyMinutesAfter = new Date(matchDateTime.getTime() + 30 * 60 * 1000);

      if (now > thirtyMinutesAfter) {
        toast({
          title: "Error",
          description: "Ticket purchasing is closed for this match.",
          variant: "destructive",
        });
        navigate(`/match/${matchSlug}`);
        return;
      }

      // Calculate available tickets
      const totalTicketsSold = matchData.tickets.reduce(
        (sum, ticket) => sum + (ticket.number_of_tickets || 0),
        0
      );
      const available = matchData.max_tickets
        ? Math.max(0, matchData.max_tickets - totalTicketsSold)
        : null;

      if (matchData.max_tickets && totalTicketsSold >= matchData.max_tickets) {
        toast({
          title: "Error",
          description: "All tickets have been sold out.",
          variant: "destructive",
        });
        navigate(`/match/${matchSlug}`);
        return;
      }

      setMatch(matchData);
      setAvailableTickets(available);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const handlePaymentInitiation = async (data: FormValues, totalPrice: number) => {
    if (!match || !paystackLoaded || !window.PaystackPop) {
      toast({
        title: "Error",
        description: "Payment system is not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await supabase.functions.invoke("initialize-paystack-transaction", {
        body: {
          email: defaultEmail,
          amount: totalPrice,
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
        onSuccess: async (transaction) => {
          try {
            // Verify payment
            const verifyResponse = await supabase.functions.invoke("verify-paystack-transaction", {
              body: { reference: transaction.reference },
            });

            if (verifyResponse.error) {
              throw new Error(verifyResponse.error.message);
            }

            const { verified, match_id, slug: matchSlug } = verifyResponse.data;

            if (!verified || match_id !== match.id || matchSlug !== slug) {
              throw new Error("Payment verification failed");
            }

            // Generate unique 6-digit ticket code
            const ticketCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Insert ticket purchase, storing total_price in naira
            const { error } = await supabase.from("tickets").insert({
              match_id: match.id,
              buyer_name: data.buyer_name,
              buyer_phone: data.buyer_phone,
              number_of_tickets: data.number_of_tickets,
              ticket_code: ticketCode,
              total_price: totalPrice, // Store in naira (e.g., 5000)
              purchase_date: new Date().toISOString(),
            });

            if (error) throw error;

            toast({
              title: "Success!",
              description: "Your tickets have been purchased.",
            });

            // Redirect to receipt page
            navigate(`ticket-receipt/${ticketCode}`);
          } catch (error) {
            console.error("Error completing purchase:", error);
            toast({
              title: "Error",
              description: "Failed to complete ticket purchase. Please try again.",
              variant: "destructive",
            });
          } finally {
            setSubmitting(false);
          }
        },
        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You've cancelled the payment process.",
            variant: "destructive",
          });
          setSubmitting(false);
        },
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!match || !slug) return;

    setSubmitting(true);

    // Re-validate available tickets
    const { data: currentTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("number_of_tickets")
      .eq("match_id", match.id);

    if (ticketsError) {
      toast({
        title: "Error",
        description: "Failed to validate ticket availability.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const totalTicketsSold = currentTickets.reduce(
      (sum, ticket) => sum + (ticket.number_of_tickets || 0),
      0
    );
    const available = match.max_tickets
      ? Math.max(0, match.max_tickets - totalTicketsSold)
      : null;

    if (available !== null && data.number_of_tickets > available) {
      toast({
        title: "Error",
        description: `Only ${available} ticket${available === 1 ? '' : 's'} remaining.`,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Calculate total price in naira (e.g., 1 ticket * ₦5000 = ₦5000)
    const totalPrice = data.number_of_tickets * (match.ticket_price || 0);

    if (!match.ticket_price || totalPrice === 0) {
      // Free tickets: insert directly
      try {
        const ticketCode = Math.floor(100000 + Math.random() * 900000).toString();
        const { error } = await supabase.from("tickets").insert({
          match_id: match.id,
          buyer_name: data.buyer_name,
          buyer_phone: data.buyer_phone,
          number_of_tickets: data.number_of_tickets,
          ticket_code: ticketCode,
          total_price: 0,
          purchase_date: new Date().toISOString(),
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Your tickets have been purchased.",
        });

        // Redirect to receipt page
        navigate(`ticket-receipt/${ticketCode}`);
      } catch (error) {
        console.error("Error purchasing tickets:", error);
        toast({
          title: "Error",
          description: "Failed to purchase tickets. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Paid tickets: initiate payment
      await handlePaymentInitiation(data, totalPrice);
    }
  };

  if (loading) {
    return (
      <div className="w-full"><RowsSkeleton /></div>
    );
  }

  if (!match) return <NotFoundState kind="match" />;

  return (
    <>
      <Seo
        title="Buy Tickets | Sport Cliq"
        description="Purchase tickets for matches and events on Sport Cliq."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <Routes>
        <Route
          path="/ticket-receipt/:ticketCode"
          element={<TicketReceipt />}
        />
        <Route
          path="/"
          element={
            <div className="min-h-screen pb-20 bg-sc-bg dark:bg-gray-900">
              <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Buy tickets</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

              <div className="p-6 max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] mb-6">
                  <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200 mb-4">{match.title}</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-sc-ink3" />
                      <span>{match.venue?.name || "Unknown Venue"}, {match.venue?.city || ""}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-sc-ink3" />
                      <span>
                        {format(new Date(match.match_date), "PPP")} at{" "}
                        {format(new Date(`1970-01-01T${match.match_time}`), "p")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Ticket className="h-4 w-4 mr-2 text-sc-ink3" />
                      <span>₦{match.ticket_price?.toFixed(2)} per ticket</span>
                    </div>
                    {match.max_tickets && (
                      <div className="flex items-center">
                        <span className="font-semibold">Tickets Available: </span>
                        <span className="ml-2">
                          {availableTickets !== null ? availableTickets : "Unlimited"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 rounded-3xl p-[18px]">
                    <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Ticket Purchase</h2>

                    <FormField
                      control={form.control}
                      name="buyer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your name"
                              className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="buyer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              placeholder="Enter 11-digit phone number"
                              className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              {...field}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/\D/g, "").slice(0, 11);
                                field.onChange(numericValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="number_of_tickets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Number of Tickets</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={availableTickets !== null ? Math.min(availableTickets, 10) : 10}
                              className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? null : parseInt(value, 10));
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                            Select up to {availableTickets !== null ? Math.min(availableTickets, 10) : 10} tickets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-3 text-lg shadow-card transition-colors"
                      disabled={submitting || !paystackLoaded}
                    >
                      {submitting ? "Processing..." : match.ticket_price ? `Pay Now (₦${(form.watch("number_of_tickets") * (match.ticket_price || 0)).toFixed(2)})` : "Get Tickets"}
                    </Button>
                  </form>
                </Form>
              </div>
              <Navbar />
            </div>
          }
        />
      </Routes>
    </>
  );
};

export default Ticketing;
