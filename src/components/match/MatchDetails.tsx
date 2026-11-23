import { format, differenceInMinutes } from "date-fns";
import { Trophy, MapPin, Calendar, Clock, Users, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  match_start_time?: string | null;
  match_end_time?: string | null;
  total_slots: number;
  organizer_name: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  venue: {
    name?: string;
    city?: string;
  } | null;
  players: {
    id: string;
    player_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
  sell_tickets: boolean;
  ticket_price?: number;
};

type Cashout = {
  id: string;
  match_id: string;
  super_code: string;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
};

type MatchDetailsProps = {
  match: Match | null;
  cashout: Cashout | null;
  handleCancelMatch: () => void;
  loading: boolean;
  isMatchPast: boolean;
};

const MatchDetails = ({ match, cashout, handleCancelMatch, loading, isMatchPast }: MatchDetailsProps) => {
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Fetch wallet balance
  useEffect(() => {
    if (!match) {
      setWalletBalance(0);
      return;
    }

    const fetchWalletBalance = async () => {
      try {
        // Fetch player data
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("player_status, number_of_slots")
          .eq("match_id", match.id);

        if (playersError) throw playersError;

        let balance = 0;
        if (match.is_paid && match.price) {
          const checkedInPlayers = playersData.filter((p) => p.player_status === "Checked In");
          balance = checkedInPlayers.reduce(
            (sum, player) => sum + ((player.number_of_slots || 1) * (match.price || 0)),
            0
          );
        }

        // Add ticket revenue if selling tickets
        if (match.sell_tickets && match.ticket_price) {
          const { data: ticketsData, error: ticketsError } = await supabase
            .from("tickets")
            .select("number_of_tickets")
            .eq("match_id", match.id)
            .eq("checked_in", true);

          if (ticketsError) throw ticketsError;

          const ticketRevenue = ticketsData.reduce(
            (sum, ticket) => sum + (ticket.number_of_tickets * (match.ticket_price || 0)),
            0
          );
          balance += ticketRevenue;
        }

        // Subtract cashout amounts for Review, Processed, and Successful statuses
        const { data: cashoutData, error: cashoutError } = await supabase
          .from("cashout_requests")
          .select("amount, status")
          .eq("match_id", match.id)
          .in("status", ["Review", "Processed", "Successful"]);

        if (cashoutError) throw cashoutError;

        if (cashoutData) {
          const cashoutTotal = cashoutData.reduce((sum, request) => sum + (request.amount || 0), 0);
          balance -= cashoutTotal;
        }

        setWalletBalance(balance < 0 ? 0 : balance);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        toast({
          title: "Error",
          description: "Failed to calculate wallet balance.",
          variant: "destructive",
        });
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();

    // Set up real-time subscription for cashout_requests and tickets
    const cashoutChannel = supabase
      .channel(`cashout_requests_match_${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cashout_requests',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          fetchWalletBalance(); // Re-fetch balance on cashout status change
        }
      )
      .subscribe();

    const ticketsChannel = supabase
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
          fetchWalletBalance(); // Re-fetch balance on ticket check-in
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cashoutChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [match, toast]);

  const canCancelMatch = () => {
    if (!match) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    const hasCheckedInPlayers = match.players?.some((p) => p.status === "Checked In") || false;
    return minutesToStart > 0 && !match.cancellation_status && !hasCheckedInPlayers;
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

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-sc-green-bg text-sc-green-dark border-green-300";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "Processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  const calculateExpectedAmount = () => {
    if (!match) return "N/A";
    let total = 0;
    if (match.is_paid && match.price) {
      const checkedInPlayers = match.players?.filter((p) => p.status === "Checked In") || [];
      const playerRevenue = checkedInPlayers.reduce(
        (sum, player) => sum + ((player.number_of_slots || 1) * (match.price || 0)),
        0
      );
      total += playerRevenue;
    }
    if (match.sell_tickets && match.ticket_price) {
      // Note: Actual ticket revenue is fetched in fetchWalletBalance
      // This is an estimate based on match.ticket_price
      total += 0; // Placeholder; real value comes from Supabase
    }
    return `₦${total.toLocaleString()}`;
  };

  const calculateTotalSlotsOccupied = () => {
    if (!match || !match.players) return 0;
    return match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
  };

  const handleCancel = async () => {
    if (!match) return;

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          cancellation_status: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match has been successfully cancelled.",
      });

      handleCancelMatch();
    } catch (error) {
      console.error("Error cancelling match:", error);
      toast({
        title: "Error",
        description: "Failed to cancel match. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-100">Match Details</h2>
        <div className="flex items-center gap-2">
          {match.cancellation_status && (
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full border bg-red-100 text-red-700 border-red-300">
              Cancelled
            </span>
          )}
          {cashout && (
            <span
              className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyles(
                cashout.status
              )}`}
            >
              Cashout: {cashout.status}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-sc-green-dark" />
          <div>
            <p className="font-medium text-sc-ink dark:text-gray-100">{match.title || "Untitled Match"}</p>
            <p className="text-sm text-sc-ink3 dark:text-gray-400">
              Organized by {match.organizer_name || "Unknown Organizer"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            {match.venue?.name || "Unknown Venue"}, {match.venue?.city || "Unknown City"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            {match.match_date ? formatDate(match.match_date) : "Date TBD"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            {match.match_time ? formatTime(match.match_time) : "Time TBD"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Users size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            {calculateTotalSlotsOccupied()}/{match.total_slots || 0} slots
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            {match.is_paid ? `₦${match.price?.toLocaleString() || "0"} per ticket` : "Free"}
            {match.sell_tickets && match.ticket_price
              ? ` | Tickets: ₦${match.ticket_price.toLocaleString()} each`
              : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-sc-green-dark" />
          <span className="text-sc-ink dark:text-gray-100">
            Wallet: ₦{walletBalance.toLocaleString() || "0"}
          </span>
        </div>
      </div>
      {match.cancellation_status && match.is_paid && (
        <div className="mt-4 p-4 rounded-lg bg-red-100 dark:bg-red-900">
          <p className="text-red-700 dark:text-red-300">
            This match has been cancelled. Players will be contacted for a refund.
          </p>
        </div>
      )}
      {cashout && (
        <div className="mt-4 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <p className="text-yellow-700 dark:text-yellow-300">
            Your cashout request is {cashout.status}. Expected amount: {calculateExpectedAmount()}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mt-4">
        <Button
          onClick={handleCancel}
          className={`bg-red-500 hover:bg-red-600 text-white ${
            !canCancelMatch() ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!canCancelMatch() || loading}
        >
          Cancel Match
        </Button>
      </div>
    </div>
  );
};

export default MatchDetails;
