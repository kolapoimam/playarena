import { format, differenceInMinutes } from "date-fns";
import { organiserRate, payout } from "@/lib/fees";
import { MapPin, Calendar, Clock, Users, Wallet, Banknote, Ticket, XCircle } from "lucide-react";
import { Bubble, ListGroup, ListRow, Pill, Progress, ScButton, StatCard, formatNairaExact, type Sport } from "@/components/sc/ui";
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
  handleCancelMatch?: () => void;
  handleCancel?: () => void;
  loading: boolean;
  isMatchPast: boolean;
};

const MatchDetails = ({ match, cashout, handleCancelMatch, handleCancel: openCancel, loading, isMatchPast }: MatchDetailsProps) => {
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

        // Same rule as the cashout screen, after the platform fee and earlier cashouts
        const requested = (cashoutData || []).reduce((sum, request) => sum + (request.amount || 0), 0);
        const { rate, note } = await organiserRate(match.id);
        setWalletBalance(payout(balance, rate, requested, note).available);
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
    const hasCheckedInPlayers = match.players?.some((p: any) => (p.player_status || p.status) === "Checked In") || false;
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
      const checkedInPlayers = match.players?.filter((p: any) => (p.player_status || p.status) === "Checked In") || [];
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

  // Cancelling is confirmed in a dialog owned by the page
  const askToCancel = () => (openCancel || handleCancelMatch)?.();

  if (!match) return null;

  const taken = calculateTotalSlotsOccupied();
  const total = match.total_slots || 0;
  const start = match.match_date && match.match_time ? new Date(`${match.match_date}T${match.match_time}`) : null;
  const state = match.cancellation_status ? "Cancelled" : isMatchPast ? "Ended" : start && differenceInMinutes(start, new Date()) <= 0 ? "Live" : "Upcoming";
  const stateSport: Sport = state === "Cancelled" ? "red" : state === "Live" ? "football" : state === "Ended" ? "gray" : "guide";
  const cashoutSport: Sport = cashout?.status === "Successful" ? "football" : cashout?.status === "Failed" ? "red" : cashout?.status === "Processed" ? "guide" : "tennis";
  const cancelReason = match.cancellation_status
    ? "This match is already cancelled."
    : start && differenceInMinutes(start, new Date()) <= 0
      ? "You can only cancel before kick off."
      : match.players?.some((p: any) => (p.player_status || p.status) === "Checked In")
        ? "Players have checked in, so it can no longer be cancelled."
        : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-sc-ink text-white rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden">
        <svg aria-hidden="true" className="absolute -right-10 -top-10 opacity-10" width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="3"><circle cx="100" cy="100" r="60" /><path d="M100 0v200" /><rect x="10" y="10" width="180" height="180" rx="12" /></svg>
        <div className="flex flex-wrap gap-1.5 relative">
          <Pill sport={stateSport}>{state}</Pill>
          <Pill sport={match.is_paid ? "tennis" : "football"}>{match.is_paid ? "Paid" : "Free"}</Pill>
          {cashout && <Pill sport={cashoutSport}>Cashout {cashout.status.toLowerCase()}</Pill>}
        </div>
        <div className="relative flex flex-col gap-1">
          <span className="text-[26px] leading-8 font-extrabold tracking-[-0.03em] line-clamp-2">{match.title || "Untitled match"}</span>
          <span className="text-sm text-white/70">Organised by {match.organizer_name || "you"}</span>
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-white/70"><span>{taken} of {total} slots filled</span><span>{total ? Math.round((taken / total) * 100) : 0}%</span></div>
          <Progress value={total ? (taken / total) * 100 : 0} color="#BEF264" track="rgba(255,255,255,0.15)" />
        </div>
      </div>

      <div className="flex gap-2.5">
        <StatCard value={formatNairaExact(walletBalance)} label="Ready to cash out" icon={Wallet} sport="money" />
        <StatCard value={match.is_paid ? formatNairaExact(match.price || 0) : "Free"} label={match.is_paid ? "Per player" : "Entry"} icon={Banknote} sport="tennis" />
      </div>

      <ListGroup title="Match info">
        <ListRow icon={MapPin} sport="venue" title={match.venue?.name || "Venue not set"} subtitle={match.venue?.city || undefined} />
        <ListRow icon={Calendar} sport="guide" title={match.match_date ? formatDate(match.match_date) : "Date not set"} subtitle="Date" />
        <ListRow icon={Clock} sport="football" title={match.match_time ? `${formatTime(match.match_time)}${match.match_end_time ? ` to ${formatTime(String(match.match_end_time).slice(11, 16) || String(match.match_end_time))}` : ""}` : "Time not set"} subtitle="Kick off" />
        <ListRow icon={Users} sport="pink" title={`${taken}/${total} slots`} subtitle={`${(match.players || []).length} players registered`} />
        {match.sell_tickets && match.ticket_price ? (
          <ListRow icon={Ticket} sport="tennis" title={`${formatNairaExact(match.ticket_price)} per ticket`} subtitle="Spectator tickets" />
        ) : null}
      </ListGroup>

      {match.cancellation_status && match.is_paid && (
        <div className="bg-sport-red-bg text-sport-red-fg rounded-3xl p-4 text-sm font-bold">This match was cancelled. Paid players will be contacted for a refund.</div>
      )}
      {cashout && (
        <div className="bg-white rounded-3xl p-4 flex items-center gap-3">
          <Bubble icon={Wallet} sport={cashoutSport} size={42} />
          <span className="flex-1 flex flex-col">
            <span className="text-[15px] font-bold">Cashout {cashout.status.toLowerCase()}</span>
            <span className="text-[13px] text-sc-ink3">Expected {calculateExpectedAmount()} to {cashout.bank_name}</span>
          </span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-2.5">
        <span className="text-base font-extrabold">Cancel match</span>
        <span className="text-sm text-sc-ink3 leading-5">{cancelReason || "Players are told straight away. Paid players are refunded."}</span>
        <ScButton kind="danger" size="md" icon={XCircle} onClick={askToCancel} disabled={!!cancelReason || loading}>Cancel this match</ScButton>
      </div>
    </div>
  );
};

export default MatchDetails;
