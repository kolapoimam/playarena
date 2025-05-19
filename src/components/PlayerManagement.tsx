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
};

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

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
  const [mode, setMode] = useState<"checkin" | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinPlayer, setCheckinPlayer] = useState<{ name: string; slots: number } | null>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [checkingInPlayers, setCheckingInPlayers] = useState<{ [key: string]: boolean }>({});

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
    const fetchUserIdAndData = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        await fetchWalletData();
      }
    };

    fetchUserIdAndData();
  }, [fetchWalletData]);

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
    }
    const isEndTimeFuture = !isPast(matchEndTime);
    return match.players.length > 0 && isEndTimeFuture;
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

  const handleCheckinCodeChange = (playerId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev) => ({ ...prev, [playerId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev) => ({
      ...prev,
      [playerId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const validateCheckinCode = async (playerId: string) => {
    const code = checkinCodes[playerId];
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Registered': return "bg-yellow-500 text-white border-yellow-600";
      case 'Checked In': return "bg-green-500 text-white border-green-600";
      case 'Absent': return "bg-red-500 text-white border-red-600";
      case "Successful": return "bg-green-100 text-green-700 border-green-300";
      case "Failed": return "bg-red-100 text-red-700 border-red-300";
      case "Processed": return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default: return "bg-gray-500 text-white border-gray-600";
    }
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Players</h2>
      
      <div className="flex gap-3 mb-4">
        <Button
          onClick={handleCheckinMode}
          className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
          disabled={!canCheckin() || match.cancellation_status}
        >
          Check-in Players
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <button
          onClick={() => setIsPlayersOpen(!isPlayersOpen)}
          className="flex items-center gap-2 w-full text-left text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Players
          {isPlayersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {isPlayersOpen && (
          <div className="space-y-4">
            {(match.players || []).length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No players registered for this match.</p>
            ) : (
              match.players?.map((player) => {
                const playerStatusEntry = playerStatuses.find(p => p.id === player.id);
                const displayStatus = playerStatusEntry?.status || player.player_status || 'Registered';

                return (
                  <div
                    key={player.id}
                    className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{player.player_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {player.details?.phone || "Not provided"}
                      </p>
                      {displayStatus === 'Checked In' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
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

      {mode === "checkin" && (
        <Button
          onClick={() => setMode(null)}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white"
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
              className="bg-green-500 hover:bg-green-600 text-white"
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
