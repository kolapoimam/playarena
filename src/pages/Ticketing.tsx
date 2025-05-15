import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar, MapPin, ArrowLeft, Ticket, Download, Copy } from "lucide-react";
import { format, addMinutes } from "date-fns";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";

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
    .max(5, { message: "Maximum 5 tickets per purchase" }),
});

type FormValues = z.infer<typeof formSchema>;

const Ticketing = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyer_name: "",
      buyer_phone: "",
      number_of_tickets: 1,
    },
  });

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
      const now = new Date("2025-05-15T15:48:00+01:00"); // 3:48 PM WAT, May 15, 2025
      const thirtyMinutesAfter = addMinutes(matchDateTime, 30);

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

    try {
      // Generate unique 6-digit ticket code
      const ticketCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Insert ticket purchase
      const { error } = await supabase.from("tickets").insert({
        match_id: match.id,
        buyer_name: data.buyer_name,
        buyer_phone: data.buyer_phone,
        number_of_tickets: data.number_of_tickets,
        ticket_code: ticketCode,
        purchase_date: new Date().toISOString(),
      });

      if (error) throw error;

      setTicketCode(ticketCode);
      setSuccessDialogOpen(true);

      toast({
        title: "Success!",
        description: "Your tickets have been purchased.",
      });
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
  };

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
      const link = document.createElement("a");
      link.download = `PlayArena-Ticket-${match?.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating ticket image:", error);
      toast({
        title: "Error",
        description: "Failed to download ticket card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyTicketCode = () => {
    if (ticketCode) {
      navigator.clipboard.writeText(ticketCode);
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
                      max={availableTickets !== null ? Math.min(availableTickets, 5) : 5}
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
                    Select up to {availableTickets !== null ? Math.min(availableTickets, 5) : 5} tickets
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
              disabled={submitting}
            >
              {submitting ? "Purchasing..." : "Buy Tickets"}
            </Button>
          </form>
        </Form>
      </div>
      <Navbar />

{/* Success Dialog */}
<Dialog open={successDialogOpen} onOpenChange={(open) => {
  if (!open) {
    navigate(`/match/${match.slug}`);
  }
  setSuccessDialogOpen(open);
}}>
  <DialogContent className="sm:max-w-[375px] rounded-2xl">
    <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Tickets Purchased!</DialogTitle>
    <DialogDescription>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
        Your tickets have been successfully purchased. Below is your unique 6-digit ticket code for entry.
      </p>
      <div className="relative">
        {/* Printer Graphic */}
        <div className="relative mx-auto w-48 h-12 bg-gray-300 dark:bg-gray-600 rounded-t-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-400 to-gray-200 dark:from-gray-700 dark:to-gray-500" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-gray-800 dark:bg-gray-900" />
        </div>
        {/* Ticket Card with Animation */}
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg transform transition-transform duration-1000 ease-out animate-slide-up"
        >
          <div className="flex items-center justify-between mb-4">
            <img src="/playarenadark.png" alt="PlayArena Logo" className="h-8 w-auto" />
            <Ticket className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">{match.title}</h2>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {format(new Date(match.match_date), "PPP")} at{" "}
                {format(new Date(`1970-01-01T${match.match_time}`), "p")}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold">Tickets: </span>
              <span className="ml-2">{form.getValues("number_of_tickets")}</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold">Total: </span>
              <span className="ml-2">
                ₦{(form.getValues("number_of_tickets") * (match.ticket_price || 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
            <p className="text-sm font-medium">Ticket Code</p>
            <p className="text-3xl font-bold tracking-wider">{ticketCode || "N/A"}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
        <strong>Note:</strong> Save or download this ticket code. You'll need it for entry on match day.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 opacity-0 transition-opacity duration-500 delay-1000 animate-fade-in">
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
    </DialogDescription>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default Ticketing;
