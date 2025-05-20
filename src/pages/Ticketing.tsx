import { useState, useEffect, useRef } from "react";
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
import { Calendar, MapPin, ArrowLeft, Ticket, Download, Copy } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

type Ticket = {
  ticket_code: string;
  buyer_name: string;
  number_of_tickets: number;
  total_price: number;
  purchase_date: string;
  match: {
    id: string;
    slug: string;
    title: string;
    match_date: string;
    match_time: string;
    venue: {
      name: string;
      city: string;
    } | null;
  };
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

const TicketReceipt = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'pdf'>('png');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tickets")
          .select(`
            ticket_code, buyer_name, number_of_tickets, total_price, purchase_date,
            match:matches(id, slug, title, match_date, match_time, venue:venues(name, city))
          `)
          .eq("ticket_code", ticketCode)
          .single();

        if (error) throw error;
        setTicket(data as Ticket);
      } catch (error) {
        console.error("Error fetching ticket:", error);
        toast({
          title: "Error",
          description: "Failed to load ticket details. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
      } finally {
        setLoading(false);
      }
    };
    if (ticketCode) fetchTicket();
  }, [ticketCode, navigate, toast]);

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({
        title: "Error",
        description: "Ticket card is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      if (downloadFormat === 'png') {
        const link = document.createElement('a');
        link.download = `PlayArena-Ticket-${ticket?.match.title.replace(/\s+/g, '-')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`PlayArena-Ticket-${ticket?.match.title.replace(/\s+/g, '-')}.pdf`);
      }
    } catch (error) {
      console.error("Error generating ticket:", error);
      toast({
        title: "Error",
        description: `Failed to download ticket as ${downloadFormat.toUpperCase()}.`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyTicketCode = () => {
    if (ticket?.ticket_code) {
      navigator.clipboard.writeText(ticket.ticket_code);
      toast({
        title: "Copied!",
        description: "Ticket code copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground">The ticket you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(`/match/${ticket.match.slug}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Match
          </Button>
          <h1 className="text-2xl font-bold">Your Ticket</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Tickets Purchased!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Your tickets have been successfully purchased. Below is your unique 6-digit ticket code for entry.
          </p>
          <div className="relative">
            {/* Printer Graphic */}
            <div className="relative mx-auto w-48 h-12 bg-gray-300 dark:bg-gray-600 rounded-t-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-400 to-gray-200 dark:from-gray-700 dark:to-gray-500" />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-gray-800 dark:bg-gray-900" />
            </div>
            {/* Ticket with Sports Ticket Styling and Printing Animation */}
            <div
              ref={cardRef}
              className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-lg max-w-md mx-auto overflow-hidden
                         border-4 border-dashed border-white/30
                         animate-ticket-print"
              style={{
                backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                backgroundSize: '40px 40px',
              }}
            >
              {/* Perforated Edge Effect */}
              <div className="absolute top-0 left-0 w-full h-2 bg-white/20 border-t border-dashed border-white/50" />
              <div className="absolute bottom-0 left-0 w-full h-2 bg-white/20 border-b border-dashed border-white/50" />
              <div className="absolute top-0 left-0 w-2 h-full bg-white/20 border-l border-dashed border-white/50" />
              <div className="absolute top-0 right-0 w-2 h-full bg-white/20 border-r border-dashed border-white/50" />

              {/* Ticket Content */}
              <div className="flex items-center justify-between mb-4 animate-ticket-content">
                <img src="/playarenadark.png" alt="PlayArena Logo" className="h-8 w-auto" />
                <Ticket className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight animate-ticket-content delay-100">{ticket.match.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm animate-ticket-content delay-200">
                <div>
                  <div className="flex items-center mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{ticket.match.venue?.name || "Venue"}, {ticket.match.venue?.city || ""}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {format(new Date(ticket.match.match_date), "PPP")} at{" "}
                      {format(new Date(`1970-01-01T${ticket.match.match_time}`), "p")}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <span className="font-semibold">Tickets:</span>
                    <span className="ml-2">{ticket.number_of_tickets}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="ml-2">₦{ticket.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner animate-ticket-content delay-300">
                <p className="text-sm font-medium uppercase tracking-wide">Ticket Code</p>
                <p className="text-4xl font-bold tracking-wider mt-1">{ticket.ticket_code}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center">
            <strong>Note:</strong> Save or download this ticket code. You'll need it for entry on match day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 animate-ticket-content delay-400">
            <div className="flex-1 relative">
              <select
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'pdf')}
                className="absolute top-0 left-0 w-20 p-2 text-sm bg-gray-100 dark:bg-gray-700 border rounded-lg"
                aria-label="Select download format"
              >
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
              </select>
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 pl-24 transition-colors"
                onClick={handleDownload}
                disabled={isDownloading}
                aria-label={`Download ticket as ${downloadFormat.toUpperCase()}`}
              >
                {isDownloading ? "Downloading..." : `Download ${downloadFormat.toUpperCase()}`}
              </Button>
            </div>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={copyTicketCode}
              disabled={isDownloading}
              aria-label="Copy ticket code"
            >
              <Copy size={16} className="mr-2" />
              Copy Code
            </Button>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
};

const Ticketing = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<number | null>(null);
  const defaultEmail = "kolapoimam1@gmail.com";

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
      const now = new Date("2025-05-15T18:15:00+01:00"); // 06:15 PM WAT, May 15, 2025
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
          amount: totalPrice * 100, // Paystack expects amount in kobo
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

            // Insert ticket purchase
            const { error } = await supabase.from("tickets").insert({
              match_id: match.id,
              buyer_name: data.buyer_name,
              buyer_phone: data.buyer_phone,
              number_of_tickets: data.number_of_tickets,
              ticket_code: ticketCode,
              total_price: totalPrice,
              purchase_date: new Date().toISOString(),
            });

            if (error) throw error;

            toast({
              title: "Success!",
              description: "Your tickets have been purchased.",
            });

            // Redirect to receipt page (relative path)
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

    // Calculate total price
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

        // Redirect to receipt page (relative path)
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
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
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

  return (
    <Routes>
      <Route
        path="/ticket-receipt/:ticketCode"
        element={<TicketReceipt />}
      />
      <Route
        path="/"
        element={
          <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
            <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
              <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-green-600 transition-colors"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold">Buy Tickets</h1>
                <div className="w-10"></div>
              </div>
            </header>

            <div className="p-6 max-w-3xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{match.title}</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{match.venue?.name || "Unknown Venue"}, {match.venue?.city || ""}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>
                      {format(new Date(match.match_date), "PPP")} at{" "}
                      {format(new Date(`1970-01-01T${match.match_time}`), "p")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Ticket className="h-4 w-4 mr-2 text-gray-500" />
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Ticket Purchase</h2>

                  <FormField
                    control={form.control}
                    name="buyer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
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
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter 11-digit phone number"
                            className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
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
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Number of Tickets</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={availableTickets !== null ? Math.min(availableTickets, 10) : 10}
                            className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? null : parseInt(value, 10));
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                          Select up to {availableTickets !== null ? Math.min(availableTickets, 10) : 10} tickets
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
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
  );
};

export default Ticketing;
