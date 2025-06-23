import { useState, useEffect, useCallback } from "react";
import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2, Ticket } from "lucide-react";
import { z } from "zod";
import { differenceInMinutes, isPast, addHours } from "date-fns";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  match_end_time?: string | null;
  sell_tickets: boolean;
  venue: {
    name?: string;
    city?: string;
  } | null;
  tickets: {
    id: string;
    buyer_name: string;
    number_of_tickets: number;
    ticket_code: string;
    checked_in: boolean;
  }[] | null;
};

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type TicketManagementProps = {
  match: Match | null;
  fetchMatch: () => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isMatchPast: boolean;
  canConfirmTickets: boolean;
  navigate: NavigateFunction;
};

const TicketManagement = ({
  match,
  fetchMatch,
  loading,
  setLoading,
  isMatchPast,
  canConfirmTickets,
  navigate,
}: TicketManagementProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"checkin" | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("");
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [verifiedTicket, setVerifiedTicket] = useState<{ buyer_name: string; number_of_tickets: number } | null>(null);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [verifyingTicket, setVerifyingTicket] = useState(false);
  const [confirmedTickets, setConfirmedTickets] = useState<
    { id: string; buyer_name: string; number_of_tickets: number; ticket_code: string }[]
  >([]);

  useEffect(() => {
    if (!match?.id || !match.sell_tickets) {
      setConfirmedTickets([]);
      return;
    }

    const fetchConfirmedTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('id, buyer_name, number_of_tickets, ticket_code, checked_in')
          .eq('match_id', match.id)
          .eq('checked_in', true);

        if (error) throw error;

        setConfirmedTickets(data || []);
      } catch (error) {
        console.error("Error fetching confirmed tickets:", error);
        toast({
          title: "Error",
          description: "Failed to load confirmed tickets.",
          variant: "destructive",
        });
        setConfirmedTickets([]);
      }
    };

    fetchConfirmedTickets();

    const ticketChannel = supabase
      .channel(`tickets_match_${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          fetchConfirmedTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [match, toast]);

  const canManageTickets = useCallback(() => {
    if (!match || !match.sell_tickets) return false;
    const now = new Date();
    let matchEndTime: Date;
    try {
      if (match.match_end_time) {
        matchEndTime = new Date(match.match_end_time);
      } else {
        matchEndTime = addHours(new Date(`${match.match_date}T${match.match_time}`), 2);
      }
      if (isNaN(matchEndTime.getTime())) {
        matchEndTime = new Date("2025-06-04T17:48:00+01:00");
      }
    } catch (error) {
      matchEndTime = new Date("2025-06-04T17:48:00+01:00");
      console.error("Error parsing match end time:", error);
    }
    return !isPast(matchEndTime);
  }, [match]);

  const handleTicketMode = () => {
    if (!match || !match.sell_tickets) {
      toast({
        title: "Ticket Management Not Available",
        description: "Match data is unavailable or tickets are not being sold.",
        variant: "destructive",
      });
      return;
    }

    if (!canManageTickets()) {
      toast({
        title: "Ticket Management Not Available",
        description: "The match has ended or ticket management is no longer available.",
        variant: "destructive",
      });
      return;
    }

    setMode("checkin");
  };

  const handleTicketCodeChange = (code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setTicketInput(numericCode);
    const validation = codeSchema.safeParse(numericCode);
    setTicketError(validation.success ? null : validation.error?.errors[0].message);
  };

  const validateTicketCode = async () => {
    if (!ticketInput || ticketInput.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit ticket code",
        variant: "destructive",
      });
      return;
    }

    if (!match || !match.id) {
      toast({
        title: "Error",
        description: "Match data not available",
        variant: "destructive",
      });
      return;
    }

    setVerifyingTicket(true);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, buyer_name, number_of_tickets, ticket_code, checked_in')
        .eq('match_id', match.id)
        .eq('ticket_code', ticketInput)
        .single();

      if (error || !data) throw new Error(error?.message || "Ticket not found");

      if (data.checked_in) throw new Error("Ticket has already been checked in");

      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          checked_in: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) throw updateError;

      const newTicket = {
        id: data.id,
        buyer_name: data.buyer_name,
        number_of_tickets: data.number_of_tickets,
        ticket_code: data.ticket_code,
      };

      setConfirmedTickets(prev => [...prev.filter(t => t.id !== data.id), newTicket]);
      setVerifiedTicket({ buyer_name: data.buyer_name, number_of_tickets: data.number_of_tickets });
      setTicketDialogOpen(true);

      toast({
        title: "Success",
        description: `Ticket for ${data.buyer_name} with ${data.number_of_tickets} ticket${data.number_of_tickets !== 1 ? 's' : ''} checked in successfully`,
      });

      setTicketInput("");
      setTicketError(null);

      await fetchMatch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify ticket code",
        variant: "destructive",
      });
    } finally {
      setVerifyingTicket(false);
    }
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Tickets</h2>
      
      <div className="flex gap-3 mb-4">
        <Button
          onClick={handleTicketMode}
          className="bg-purple-500 hover:bg-purple-600 text-white flex-1"
          disabled={!canManageTickets()}
        >
          Check-in Tickets
        </Button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        <button
          onClick={() => setIsTicketsOpen(!isTicketsOpen)}
          className="flex items-center gap-2 w-full text-left text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Tickets
          {isTicketsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {isTicketsOpen && (
          <div className="space-y-4">
            {mode === "checkin" && (
              <div className="flex gap-2 w-full">
                <Input
                  placeholder="Enter ticket code"
                  value={ticketInput}
                  onChange={(e) => handleTicketCodeChange(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-full sm:w-[150px]"
                  disabled={verifyingTicket}
                />
                <Button
                  onClick={validateTicketCode}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  disabled={!ticketInput || ticketInput.length !== 6 || verifyingTicket}
                >
                  {verifyingTicket ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            )}
            {ticketError && (
              <p className="text-sm text-red-600 mt-1">{ticketError}</p>
            )}
            {confirmedTickets.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No tickets confirmed for this match.</p>
            ) : (
              confirmedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{ticket.buyer_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Tickets: {ticket.number_of_tickets}
                    </p>
                  </div>
                  <span
                    className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded border bg-green-500 text-white border-green-600"
                  >
                    Checked In
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {mode === "checkin" && (
        <Button
          onClick={() => setMode(null)}
          className="mt-4 bg-purple-500 hover:bg-purple-600 text-white"
          disabled={verifyingTicket}
        >
          {verifyingTicket ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Done"
          )}
        </Button>
      )}

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Ticket Check-in Successful</DialogTitle>
            <DialogDescription>
              {verifiedTicket && (
                <>
                  Successfully checked in ticket for {verifiedTicket.buyer_name} with {verifiedTicket.number_of_tickets} ticket{verifiedTicket.number_of_tickets !== 1 ? 's' : ''}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setTicketDialogOpen(false)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagement;
