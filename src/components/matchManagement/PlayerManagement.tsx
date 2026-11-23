import { useState, useEffect, useCallback } from "react";
import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
      let matchEndTime: Date;
      try {
        if (match.match_end_time) {
          matchEndTime = new Date(match.match_end_time);
        } else {
          matchEndTime = addHours(new Date(`${match.match_date}T${match.match_time}`), 2);
        }
        if (isNaN(matchEndTime.getTime())) {
          matchEndTime = new Date("2025-05-17T15:00:00+01:00");
        }
      } catch (error) {
        matchEndTime = new Date("2025-05-17T15:00:00+01:00");
      }

      if (isPast(matchEndTime) && playersData.length > 0) {
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
    let matchEndTime: Date;
    try {
      if (match.match_end_time) {
        matchEndTime = new Date(match.match_end_time);
      } else {
        matchEndTime = addHours(new Date(`${match.match_date}T${match.match_time}`), 2);
      }
      if (isNaN(matchEndTime.getTime())) {
        matchEndTime = new Date("2025-05-17T15:00:00+01:00");
      }
    } catch (error) {
      matchEndTime = new Date("2025-05-17T15:00:00+01:00");
      console.error("Error parsing match end time:", error);
    }
    const isEndTimeFuture = !isPast(matchEndTime);
    return match.players.length > 0 && isEndTimeFuture;
  };

  const canManageTickets = () => {
    if (!match || !match.sell_tickets || match.cancellation_status) return false;
    const now = new Date();
    let matchEndTime: Date;
    try {
      if (match.match_end_time) {
        matchEndTime = new Date(match.match_end_time);
      } else {
        matchEndTime = addHours(new Date(`${match.match_date}T${match.match_time}`), 2);
      }
      if (isNaN(matchEndTime.getTime())) {
        matchEndTime = new Date("2025-05-17T15:00:00+01:00");
      }
    } catch (error) {
      matchEndTime = new Date("2025-05-17T15:00:00+01:00");
      console.error("Error parsing match end time:", error);
    }
    const isEndTimeFuture = !isPast(matchEndTime);
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

  if (!match) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] dark:border-gray-700">
      <h2 className="text-lg font-extrabold tracking-[-0.01em] mb-4 text-sc-ink dark:text-gray-100">Manage Players</h2>
      
      <div className="flex gap-3 mb-4">
        <Button
          onClick={handleCheckinMode}
          className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
          disabled={!canCheckin() || match.cancellation_status}
        >
          Check-in Players
        </Button>
        <Button
          onClick={() => navigate(`/match/${match.slug}/team-management`, { state: { isVerified: true } })}
          className="bg-sc-green hover:brightness-95 text-sc-green-ink flex-1 font-bold"
          disabled={match.cancellation_status}
        >
          Manage Teams
        </Button>
        {match.sell_tickets && (
          <Button
            onClick={handleTicketMode}
            className="bg-purple-500 hover:bg-purple-600 text-white flex-1"
            disabled={!canManageTickets() || match.cancellation_status}
          >
            Manage Tickets
          </Button>
        )}
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        <button
          onClick={() => setIsPlayersOpen(!isPlayersOpen)}
          className="flex items-center gap-2 w-full text-left text-lg font-semibold text-sc-ink dark:text-gray-100 mb-4"
        >
          Players
          {isPlayersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {mode === "checkin" && (
          <div className="mb-4">
            <QrScanButton label="Scan player QR code" onClick={() => setScanFor("player")} />
          </div>
        )}
        {isPlayersOpen && (
          <div className="space-y-4">
            {(match.players || []).length === 0 ? (
              <p className="text-sc-ink3 dark:text-gray-400">No players registered for this match.</p>
            ) : (
              match.players?.map((player) => {
                const playerStatusEntry = playerStatuses.find(p => p.id === player.id);
                const displayStatus = playerStatusEntry?.status || player.player_status || 'Registered';

                return (
                  <div
                    key={player.id}
                    className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-sc-soft dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sc-ink dark:text-gray-100">{player.player_name}</p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Phone: {player.details?.phone || "Not provided"}
                      </p>
                      {displayStatus === 'Checked In' && (
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Slots: {player.number_of_slots || 1}
                        </p>
                      )}
                    </div>
                    <span
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(displayStatus)}`}
                    >
                      {displayStatus}
                    </span>
                    {mode === "checkin" && displayStatus !== 'Checked In' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Input
                          placeholder="Enter check-in code"
                          value={checkinCodes[player.id] || ""}
                          onChange={(e) => handleCheckinCodeChange(player.id, e.target.value)}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          className="w-full sm:w-[150px]"
                          disabled={checkingInPlayers[player.id]}
                        />
                        <Button
                          onClick={() => validateCheckinCode(player.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          disabled={
                            !checkinCodes[player.id] ||
                            checkinCodes[player.id].length !== 6 ||
                            checkingInPlayers[player.id]
                          }
                        >
                          {checkingInPlayers[player.id] ? (
                            <Loader2 size={16} className="mr-2 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    )}
                    {checkinCodeErrors[player.id] && (
                      <p className="text-sm text-red-600 mt-1">{checkinCodeErrors[player.id]}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {match.sell_tickets && (
        <div className="max-h-[400px] overflow-y-auto mt-6">
          <button
            onClick={() => setIsTicketsOpen(!isTicketsOpen)}
            className="flex items-center gap-2 w-full text-left text-lg font-semibold text-sc-ink dark:text-gray-100 mb-4"
          >
            Tickets - Total: ₦{calculateTotalAmount().toLocaleString()}
            {isTicketsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {isTicketsOpen && (
            <div className="space-y-4">
              {mode === "ticket" && (
                <QrScanButton label="Scan ticket QR code" onClick={() => setScanFor("ticket")} />
              )}
              {mode === "ticket" && (
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
                <p className="text-sc-ink3 dark:text-gray-400">No tickets confirmed for this match.</p>
              ) : (
                confirmedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-sc-soft dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sc-ink dark:text-gray-100">{ticket.buyer_name}</p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Tickets: {ticket.number_of_tickets}
                      </p>
                    </div>
                    <span
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded border bg-[#DCFCE7] text-[#15803D] border-transparent`}
                    >
                      Checked In
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {mode === "checkin" && (
        <Button
          onClick={() => setMode(null)}
          className="mt-4 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Done"
          )}
        </Button>
      )}

      {mode === "ticket" && (
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

      <QrScannerDialog
        open={!!scanFor}
        onOpenChange={(v) => !v && setScanFor(null)}
        onCode={handleScannedCode}
        title={scanFor === "ticket" ? "Scan spectator ticket" : "Scan to check in"}
        hint={scanFor === "ticket" ? "Point the camera at the QR code on the spectator's ticket" : "Point the camera at the QR code on the player's ticket"}
      />

      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Check-in Successful</DialogTitle>
            <DialogDescription>
              {checkinPlayer && (
                <>
                  Successfully checked in {checkinPlayer.name} with {checkinPlayer.slots} slot{checkinPlayer.slots !== 1 ? 's' : ''}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setCheckinDialogOpen(false)}
              className="bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default PlayerManagement;
