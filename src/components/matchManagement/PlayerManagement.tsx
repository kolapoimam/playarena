import { useState, useEffect, useCallback, useRef } from "react";
import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Check, CheckCircle2, Clock, Loader2, QrCode, ScanLine, Shirt, Ticket, Users } from "lucide-react";
import { Avatar, Bubble, EmptyState, Pill, ScButton, Segmented, StatCard, formatNairaExact, initialsOf, type Sport } from "@/components/sc/ui";
import { z } from "zod";
import { differenceInMinutes, isPast, addHours } from "date-fns";

import QrScannerDialog, { QrScanButton } from "@/components/sc/QrScanner";
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
    player_status: 'Registered' | 'Checked In' | 'Absent';
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
  sell_tickets: boolean;
  ticket_price?: number;
};


/** When the match ends. Handles a full timestamp or a plain time, and falls back to kick off plus 2 hours. */
const matchEndOf = (m: { match_date: string; match_time: string; match_end_time?: string | null }): Date | null => {
  const day = String(m.match_date || "").slice(0, 10);
  const end = m.match_end_time ? String(m.match_end_time) : "";
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(end)) d = new Date(end);
  else if (/^\d{1,2}:\d{2}/.test(end) && day) d = new Date(`${day}T${end.length === 5 ? end + ":00" : end}`);
  if (!d || isNaN(d.getTime())) d = addHours(new Date(`${day}T${m.match_time}`), 2);
  return isNaN(d.getTime()) ? null : d;
};

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type ConfirmedTicket = {
  id: string;
  buyer_name: string;
  number_of_tickets: number;
  ticket_code: string;
};

type PlayerManagementProps = {
  match: Match | null;
  tempIdentifier: string;
  playerStatuses: { id: string; status: 'Registered' | 'Checked In' | 'Absent'; checkinCode: string }[];
  setPlayerStatuses: (statuses: { id: string; status: 'Registered' | 'Checked In' | 'Absent'; checkinCode: string }[]) => void;
  checkinCodes: { [key: string]: string };
  setCheckinCodes: (codes: { [key: string]: string }) => void;
  checkinCodeErrors: { [key: string]: string | null };
  setCheckinCodeErrors: (errors: { [key: string]: string | null }) => void;
  fetchMatch: () => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isMatchPast: boolean;
  canConfirmPlayers: boolean;
  handleCancelMatch: () => void;
  navigate: NavigateFunction;
};

const PlayerManagement = ({
  match,
  tempIdentifier,
  playerStatuses,
  setPlayerStatuses,
  checkinCodes,
  setCheckinCodes,
  checkinCodeErrors,
  setCheckinCodeErrors,
  fetchMatch,
  loading,
  setLoading,
  isMatchPast,
  canConfirmPlayers,
  handleCancelMatch,
  navigate,
}: PlayerManagementProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"checkin" | "ticket" | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinPlayer, setCheckinPlayer] = useState<{ name: string; slots: number } | null>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const absentMarkedFor = useRef<string | null>(null);
  const [checkingInPlayers, setCheckingInPlayers] = useState<{ [key: string]: boolean }>({});
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("");
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [confirmedTickets, setConfirmedTickets] = useState<ConfirmedTicket[]>([]);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [verifyingTicket, setVerifyingTicket] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState<{ buyer_name: string; number_of_tickets: number } | null>(null);

  // Initialize playerStatuses with fresh data from Supabase
  useEffect(() => {
    if (!match?.id) return;

    const fetchPlayerStatuses = async () => {
      try {
        const { data: playersData, error } = await supabase
          .from('players')
          .select('id, player_status, confirmation_code')
          .eq('match_id', match.id);

        if (error) throw error;

        const initialStatuses = playersData.map(player => ({
          id: player.id,
          status: (player.player_status || 'Registered') as 'Registered' | 'Checked In' | 'Absent',
          checkinCode: checkinCodes[player.id] || ''
        }));
        setPlayerStatuses(initialStatuses);
      } catch (error) {
        console.error("Error fetching player statuses from Supabase:", error);
        toast({
          title: "Error",
          description: "Failed to load player statuses.",
          variant: "destructive",
        });
        if (match?.players) {
          const initialStatuses = match.players.map(player => ({
            id: player.id,
            status: (player.player_status || 'Registered') as 'Registered' | 'Checked In' | 'Absent',
            checkinCode: checkinCodes[player.id] || ''
          }));
          setPlayerStatuses(initialStatuses);
        }
      }
    };

    fetchPlayerStatuses();
  }, [match, setPlayerStatuses, checkinCodes, toast]);

  // Fetch confirmed tickets
  useEffect(() => {
    if (!match?.id || !match.sell_tickets) {
      setConfirmedTickets([]);
      return;
    }

    const fetchConfirmedTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('id, buyer_name, number_of_tickets, ticket_code')
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

    // Set up real-time subscription for tickets
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

  const fetchWalletData = useCallback(async () => {
    if (!match || !match.id) return;

    try {
      // Fetch fresh player data from Supabase for wallet balance calculation
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_status, number_of_slots')
        .eq('match_id', match.id);

      if (playersError) throw playersError;

      // Check if match has ended and update players to Absent if necessary
      const now = new Date();
      const matchEndTime = matchEndOf(match);

      // Mark no-shows once per match, never in a loop
      if (matchEndTime && isPast(matchEndTime) && playersData.length > 0 && absentMarkedFor.current !== match.id) {
        absentMarkedFor.current = match.id;
        const registeredPlayers = playersData.filter(p => p.player_status === 'Registered');
        if (registeredPlayers.length > 0) {
          try {
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                player_status: 'Absent',
                updated_at: new Date().toISOString()
              })
              .eq('match_id', match.id)
              .eq('player_status', 'Registered');

            if (updateError) throw updateError;

            setPlayerStatuses(prev =>
              prev.map(p => 
                registeredPlayers.some(rp => rp.id === p.id) 
                  ? { ...p, status: 'Absent' } 
                  : p
              )
            );

            await fetchMatch();
          } catch (error) {
            console.error("Error updating players to Absent:", error);
            toast({
              title: "Error",
              description: "Failed to update player statuses to Absent.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data for wallet balance:", error);
      toast({
        title: "Error",
        description: "Failed to calculate wallet balance.",
        variant: "destructive",
      });
    }
  }, [match, fetchMatch, setPlayerStatuses, toast]);

  useEffect(() => {
    if (!match) return;
    fetchWalletData();
  }, [match, fetchWalletData]);

  const hasCheckedInPlayers = () => {
    return playerStatuses.some(p => p.status === 'Checked In') || false;
  };

  const canCheckin = () => {
    if (!match || match.cancellation_status || !match.players?.length) return false;
    const now = new Date();
    const matchEndTime = matchEndOf(match);
    const isEndTimeFuture = !!matchEndTime && !isPast(matchEndTime);
    return match.players.length > 0 && isEndTimeFuture;
  };

  const canManageTickets = () => {
    if (!match || !match.sell_tickets || match.cancellation_status) return false;
    const now = new Date();
    const matchEndTime = matchEndOf(match);
    const isEndTimeFuture = !!matchEndTime && !isPast(matchEndTime);
    return isEndTimeFuture;
  };

  const [scanFor, setScanFor] = useState<"player" | "ticket" | null>(null);

  const handleScannedCode = async (code: string) => {
    if (scanFor === "ticket") {
      setTicketInput(code);
      await validateTicketCode(code);
      return;
    }
    const player = match?.players?.find((p) => p.confirmation_code === code);
    if (!player) {
      toast({ title: "Code not found", description: "No player in this match has that code.", variant: "destructive" });
      return;
    }
    await validateCheckinCode(player.id, code);
  };

  const handleCheckinMode = () => {
    if (!match || match.cancellation_status) {
      toast({
        title: "Check-in Not Available",
        description: "Match data is unavailable or the match is canceled.",
        variant: "destructive",
      });
      return;
    }
    
    if (!canCheckin()) {
      const reason = !match.players?.length
        ? "No players are registered for this match."
        : "The match has ended or check-in is no longer available.";
      toast({
        title: "Check-in Not Available",
        description: reason,
        variant: "destructive",
      });
      return;
    }

    setMode("checkin");
  };

  const handleTicketMode = () => {
    if (!match || match.cancellation_status || !match.sell_tickets) {
      toast({
        title: "Ticket Management Not Available",
        description: "Match data is unavailable, the match is canceled, or tickets are not being sold.",
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

    setMode("ticket");
  };

  const handleCheckinCodeChange = (playerId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev) => ({ ...prev, [playerId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev) => ({
      ...prev,
      [playerId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const handleTicketCodeChange = (code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setTicketInput(numericCode);
    const validation = codeSchema.safeParse(numericCode);
    setTicketError(validation.success ? null : validation.error?.errors[0].message);
  };

  const validateCheckinCode = async (playerId: string, override?: string) => {
    const code = override ?? checkinCodes[playerId];
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    const player = match?.players?.find(p => p.id === playerId);
    if (!player) {
      toast({
        title: "Error",
        description: "Player not found",
        variant: "destructive",
      });
      return;
    }

    setCheckingInPlayers(prev => ({ ...prev, [playerId]: true }));

    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, confirmation_code, player_status')
        .eq('id', playerId)
        .single();

      if (error || !data) throw new Error(error?.message || "Player not found in database");

      if (data.player_status !== 'Registered') throw new Error("Player is already checked in or absent");
      if (data.confirmation_code !== code) throw new Error("Invalid confirmation code");

      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          player_status: 'Checked In',
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (updateError) throw updateError;

      // Fetch the updated player data directly from Supabase
      const { data: updatedPlayerData, error: fetchError } = await supabase
        .from('players')
        .select('id, player_status')
        .eq('id', playerId)
        .single();

      if (fetchError || !updatedPlayerData) throw new Error(fetchError?.message || "Failed to fetch updated player data");

      setPlayerStatuses(prev =>
        prev.map(p =>
          p.id === playerId
            ? { ...p, status: updatedPlayerData.player_status as 'Registered' | 'Checked In' | 'Absent' }
            : p
        )
      );

      setCheckinPlayer({ name: player.player_name, slots: player.number_of_slots || 1 });
      setCheckinDialogOpen(true);

      toast({
        title: "Success",
        description: `${player.player_name} has been checked in successfully`,
      });

      setCheckinCodes(prev => ({ ...prev, [playerId]: "" }));
      setCheckinCodeErrors(prev => ({ ...prev, [playerId]: null }));
      
      await fetchMatch();
    } catch (error: any) {
      if (error.message === "Player is already checked in or absent") {
        const { data: updatedPlayerData, error: fetchError } = await supabase
          .from('players')
          .select('id, player_status')
          .eq('id', playerId)
          .single();

        if (fetchError || !updatedPlayerData) {
          toast({
            title: "Error",
            description: "Failed to fetch updated player status.",
            variant: "destructive",
          });
          return;
        }

        setPlayerStatuses(prev =>
          prev.map(p =>
            p.id === playerId
              ? { ...p, status: updatedPlayerData.player_status as 'Registered' | 'Checked In' | 'Absent' }
              : p
          )
        );

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to verify code",
          variant: "destructive",
        });
      }
    } finally {
      setCheckingInPlayers(prev => ({ ...prev, [playerId]: false }));
    }
  };

  const validateTicketCode = async (override?: unknown) => {
    const code = typeof override === "string" ? override : ticketInput;
    if (!code || code.length !== 6) {
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
        .eq('ticket_code', code)
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

      const newTicket: ConfirmedTicket = {
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

      // Trigger wallet balance update
      await fetchWalletData();
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Registered': return "bg-[#FEF9C3] text-[#A16207] border-transparent";
      case 'Checked In': return "bg-[#DCFCE7] text-[#15803D] border-transparent";
      case 'Absent': return "bg-[#FEE2E2] text-[#B91C1C] border-transparent";
      case "Successful": return "bg-sc-green-bg text-sc-green-dark border-green-300";
      case "Failed": return "bg-red-100 text-red-700 border-red-300";
      case "Processed": return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default: return "bg-sc-soft text-sc-ink2 border-transparent";
    }
  };

  const calculateTotalAmount = () => {
    if (!match?.ticket_price) return 0;
    return confirmedTickets.reduce((sum, ticket) => sum + ticket.number_of_tickets * match.ticket_price, 0);
  };

  const [filter, setFilter] = useState<"all" | "waiting" | "in">("all");

  if (!match) return null;

  const players = match.players || [];
  const KNOWN = ["Registered", "Checked In", "Absent"];
  const statusOf = (pl: NonNullable<Match["players"]>[number]) => {
    const fromState = playerStatuses.find((p) => p.id === pl.id)?.status;
    if (fromState && KNOWN.includes(fromState)) return fromState;
    return pl.player_status && KNOWN.includes(pl.player_status) ? pl.player_status : "Registered";
  };
  const checkedIn = players.filter((pl) => statusOf(pl) === "Checked In");
  const slotsTaken = players.reduce((n, pl) => n + (pl.number_of_slots || 1), 0);
  const shown = players.filter((pl) =>
    filter === "all" ? true : filter === "in" ? statusOf(pl) === "Checked In" : statusOf(pl) !== "Checked In"
  );
  const statusSport = (st: string): Sport => (st === "Checked In" ? "football" : st === "Absent" ? "red" : "tennis");

  const tools = [
    { key: "checkin", icon: QrCode, sport: "football" as Sport, title: "Check in", sub: "Scan or type codes", onClick: handleCheckinMode, active: mode === "checkin" },
    { key: "teams", icon: Shirt, sport: "venue" as Sport, title: "Teams", sub: "Split, score, report", onClick: () => {
        if (match.cancellation_status) { toast({ title: "Match cancelled", description: "Teams are closed for a cancelled match.", variant: "destructive" }); return; }
        navigate(`/match/${match.slug}/team-management`, { state: { isVerified: true } });
      }, active: false },
    ...(match.sell_tickets ? [{ key: "tickets", icon: Ticket, sport: "tennis" as Sport, title: "Tickets", sub: "Spectator entry", onClick: handleTicketMode, active: mode === "ticket" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {match.cancellation_status && (
        <div className="bg-sport-red-bg text-sport-red-fg rounded-3xl p-4 flex gap-3 items-center">
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm font-bold">This match was cancelled. Check in and teams are closed.</span>
        </div>
      )}

      <div className="flex gap-2.5">
        <StatCard value={`${slotsTaken}/${match.total_slots}`} label="Slots filled" icon={Users} sport="football" />
        <StatCard value={checkedIn.length} label="Checked in" icon={CheckCircle2} sport="money" />
        <StatCard value={players.length - checkedIn.length} label="Waiting" icon={Clock} sport="tennis" />
      </div>

      <div className={`grid gap-2.5 ${tools.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            className={`bg-white rounded-3xl p-3.5 flex flex-col items-start gap-2.5 text-left transition-transform active:scale-[0.98] ${t.active ? "ring-2 ring-sc-green" : ""}`}
          >
            <Bubble icon={t.icon} sport={t.sport} size={40} />
            <span className="flex flex-col">
              <span className="text-[15px] font-extrabold">{t.title}</span>
              <span className="text-xs text-sc-ink3 leading-4">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === "checkin" && (
        <div className="bg-sc-ink text-white rounded-3xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-[11px] font-bold tracking-[0.12em] text-[#BEF264]">CHECK IN IS ON</span>
              <span className="text-sm text-white/80">Scan a player's QR ticket, or type their 6 digit code below.</span>
            </span>
          </div>
          <div className="flex gap-2">
            <ScButton kind="primary" size="md" icon={ScanLine} onClick={() => setScanFor("player")}>Scan QR</ScButton>
            <ScButton kind="white" size="md" full={false} onClick={() => setMode(null)} className="px-6">Done</ScButton>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-[-0.01em]">Players</span>
          <span className="text-sm font-bold text-sc-ink3">{players.length} registered</span>
        </div>
        {players.length > 0 && (
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as "all" | "waiting" | "in")}
            options={[
              { value: "all", label: `All ${players.length}` },
              { value: "waiting", label: `Waiting ${players.length - checkedIn.length}` },
              { value: "in", label: `In ${checkedIn.length}` },
            ]}
          />
        )}
        {players.length === 0 ? (
          <EmptyState icon={Users} sport="football" title="No players yet" subtitle="Share the match link. Players show up here as soon as they join." />
        ) : shown.length === 0 ? (
          <EmptyState icon={filter === "in" ? CheckCircle2 : Clock} sport="gray" title={filter === "in" ? "Nobody checked in yet" : "Everyone is in"} subtitle={filter === "in" ? "Turn on check in and scan tickets as players arrive." : "All registered players have checked in."} />
        ) : (
          <div className="flex flex-col divide-y divide-sc-line">
            {shown.map((player) => {
              const st = statusOf(player);
              const busy = !!checkingInPlayers[player.id];
              return (
                <div key={player.id} className="py-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(player.player_name)} seed={player.player_name} size={42} />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[15px] font-bold truncate">{player.player_name}</span>
                      <span className="text-[13px] text-sc-ink3 truncate">
                        {(player.number_of_slots || 1) > 1 ? `${player.number_of_slots} slots · ` : ""}{player.details?.phone || "No phone"}
                      </span>
                    </span>
                    <Pill sport={statusSport(st)}>{st === "Registered" ? "Waiting" : st}</Pill>
                  </div>
                  {mode === "checkin" && st !== "Checked In" && (
                    <div className="flex gap-2 pl-[54px]">
                      <Input
                        placeholder="6 digit code"
                        value={checkinCodes[player.id] || ""}
                        onChange={(e) => handleCheckinCodeChange(player.id, e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="h-11 flex-1 tracking-[0.3em] font-bold placeholder:tracking-normal placeholder:font-semibold"
                        disabled={busy}
                      />
                      <ScButton
                        size="sm"
                        full={false}
                        className="h-11 px-5"
                        onClick={() => validateCheckinCode(player.id)}
                        disabled={!checkinCodes[player.id] || checkinCodes[player.id].length !== 6 || busy}
                      >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                      </ScButton>
                    </div>
                  )}
                  {checkinCodeErrors[player.id] && <p className="m-0 pl-[54px] text-xs font-bold text-sport-red-fg">{checkinCodeErrors[player.id]}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {match.sell_tickets && (
        <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold tracking-[-0.01em]">Spectator tickets</span>
            <span className="text-sm font-extrabold text-sport-money-fg">{formatNairaExact(calculateTotalAmount())}</span>
          </div>
          {mode === "ticket" ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Input
                  placeholder="6 digit ticket code"
                  value={ticketInput}
                  onChange={(e) => handleTicketCodeChange(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="h-11 flex-1 tracking-[0.3em] font-bold placeholder:tracking-normal placeholder:font-semibold"
                  disabled={verifyingTicket}
                />
                <ScButton size="sm" full={false} className="h-11 px-5" kind="dark" onClick={() => validateTicketCode()} disabled={!ticketInput || ticketInput.length !== 6 || verifyingTicket}>
                  {verifyingTicket ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                </ScButton>
              </div>
              {ticketError && <p className="m-0 text-xs font-bold text-sport-red-fg">{ticketError}</p>}
              <div className="flex gap-2">
                <ScButton kind="soft" size="md" icon={ScanLine} onClick={() => setScanFor("ticket")}>Scan ticket</ScButton>
                <ScButton kind="white" size="md" full={false} className="px-6" onClick={() => setMode(null)}>Done</ScButton>
              </div>
            </div>
          ) : (
            <ScButton kind="soft" size="md" icon={Ticket} onClick={handleTicketMode}>Check in tickets</ScButton>
          )}
          {confirmedTickets.length === 0 ? (
            <EmptyState icon={Ticket} sport="tennis" title="No tickets checked in" subtitle="Checked in spectator tickets appear here with the amount collected." />
          ) : (
            <div className="flex flex-col divide-y divide-sc-line">
              {confirmedTickets.map((ticket) => (
                <div key={ticket.id} className="py-3 flex items-center gap-3">
                  <Bubble icon={Ticket} sport="tennis" size={40} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[15px] font-bold truncate">{ticket.buyer_name}</span>
                    <span className="text-[13px] text-sc-ink3">{ticket.number_of_tickets} ticket{ticket.number_of_tickets !== 1 ? "s" : ""}</span>
                  </span>
                  <Pill sport="football">Checked in</Pill>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <QrScannerDialog
        open={!!scanFor}
        onOpenChange={(v) => !v && setScanFor(null)}
        onCode={handleScannedCode}
        title={scanFor === "ticket" ? "Scan spectator ticket" : "Scan to check in"}
        hint={scanFor === "ticket" ? "Point the camera at the QR code on the spectator's ticket" : "Point the camera at the QR code on the player's ticket"}
      />

      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[380px] rounded-[28px] bg-white p-6 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-sc-green text-white flex items-center justify-center"><Check size={28} strokeWidth={3} /></span>
          <DialogTitle className="text-xl font-extrabold">Checked in</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">
            {checkinPlayer && <>{checkinPlayer.name} is in with {checkinPlayer.slots} slot{checkinPlayer.slots !== 1 ? "s" : ""}.</>}
          </DialogDescription>
          <ScButton onClick={() => setCheckinDialogOpen(false)}>Next player</ScButton>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[380px] rounded-[28px] bg-white p-6 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-sport-tennis text-sc-ink flex items-center justify-center"><Ticket size={26} /></span>
          <DialogTitle className="text-xl font-extrabold">Ticket checked in</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">
            {verifiedTicket && <>{verifiedTicket.buyer_name} is in with {verifiedTicket.number_of_tickets} ticket{verifiedTicket.number_of_tickets !== 1 ? "s" : ""}.</>}
          </DialogDescription>
          <ScButton kind="dark" onClick={() => setTicketDialogOpen(false)}>Next ticket</ScButton>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;
