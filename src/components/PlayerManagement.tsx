import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { z } from "zod";

type Match = {
  id: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
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

type PlayerStatus = {
  id: string;
  status: "Registered" | "Checked In" | "Absent";
  checkinCode: string;
};

type CheckinCodes = { [key: string]: string };
type CheckinCodeErrors = { [key: string]: string | null };

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type PlayerManagementProps = {
  match: Match | null;
  fetchMatch: () => void;
};

const PlayerManagement = ({
  match,
  fetchMatch,
}: PlayerManagementProps) => {
  const { toast } = useToast();
  const [playerStatuses, setPlayerStatuses] = useState<PlayerStatus[]>([]);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinPlayer, setCheckinPlayer] = useState<{
    id: string;
    name: string;
    slots: number;
  } | null>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [checkingInPlayers, setCheckingInPlayers] = useState<{
    [key: string]: boolean;
  }>({});
  const [checkinCodes, setCheckinCodes] = useState<CheckinCodes>({});
  const [checkinCodeErrors, setCheckinCodeErrors] = useState<CheckinCodeErrors>({});

  useEffect(() => {
    if (!match?.id) return;

    const fetchPlayerStatuses = async () => {
      try {
        const { data: playersData, error } = await supabase
          .from('players')
          .select('id, player_status, number_of_slots')
          .eq('match_id', match.id);

        if (error) throw error;

        const initialStatuses = playersData.map(player => ({
          id: player.id,
          status: player.player_status as "Registered" | "Checked In" | "Absent",
          checkinCode: checkinCodes[player.id] || ''
        }));
        setPlayerStatuses(initialStatuses);
      } catch (error) {
        console.error("Error fetching player statuses:", error);
        toast({
          title: "Error",
          description: "Failed to load player statuses.",
          variant: "destructive",
        });
        if (match?.players) {
          const initialStatuses = match.players.map(player => ({
            id: player.id,
            status: player.player_status,
            checkinCode: checkinCodes[player.id] || ''
          }));
          setPlayerStatuses(initialStatuses);
        }
      }
    };

    fetchPlayerStatuses();

    const channel = supabase
      .channel(`players_match_${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          fetchPlayerStatuses();
          fetchMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match, setPlayerStatuses, checkinCodes, fetchMatch, toast]);

  const handleCheckinMode = (player: any) => {
    setCheckinPlayer({
      id: player.id,
      name: player.player_name,
      slots: player.number_of_slots || 1,
    });
    setCheckinDialogOpen(true);
  };

  const handleCheckinCodeChange = (playerId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev: { [key: string]: string }) => ({ ...prev, [playerId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev: { [key: string]: string | null }) => ({
      ...prev,
      [playerId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const handleCheckin = async (playerId: string) => {
    if (!match) return;

    const player = match.players?.find((p) => p.id === playerId);
    if (!player) {
      toast({
        title: "Error",
        description: "Player not found.",
        variant: "destructive",
      });
      return;
    }

    const code = checkinCodes[playerId];
    if (!code || code.length !== 6) {
      setCheckinCodeErrors((prev: { [key: string]: string | null }) => ({
        ...prev,
        [playerId]: "Please enter a 6-digit code",
      }));
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setCheckingInPlayers((prev) => ({ ...prev, [playerId]: true }));

    let currentStatus: "Registered" | "Checked In" | "Absent" | null = null;

    try {
      const { data, error } = await supabase
        .from("players")
        .update({ player_status: "Checked In" })
        .eq("id", playerId)
        .eq("confirmation_code", code)
        .select("id, player_status")
        .single();

      if (error) throw error;

      currentStatus = player.player_status;

      // Sync UI with updated data
      setPlayerStatuses((prev: { id: string; status: "Registered" | "Checked In" | "Absent"; checkinCode: string; }[]) =>
        prev.map((status) =>
          status.id === playerId
            ? { ...status, status: "Checked In" }
            : status
        )
      );

      fetchMatch();

      setCheckinPlayer({
        id: playerId,
        name: player.player_name,
        slots: player.number_of_slots || 1,
      });
      setCheckinDialogOpen(true);

      toast({
        title: "Success",
        description: `${player.player_name} has been checked in successfully.`,
      });

      // Clear check-in code and errors
      setCheckinCodes((prev: { [key: string]: string }) => {
        const newCodes = { ...prev };
        delete newCodes[playerId];
        return newCodes;
      });

      setCheckinCodeErrors((prev: { [key: string]: string | null }) => {
        const newErrors = { ...prev };
        delete newErrors[playerId];
        return newErrors;
      });
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in player",
        variant: "destructive",
      });
      setPlayerStatuses((prev: { id: string; status: "Registered" | "Checked In" | "Absent"; checkinCode: string; }[]) =>
        prev.map((status) =>
          status.id === playerId
            ? { ...status, status: currentStatus || "Registered" }
            : status
        )
      );
    } finally {
      setCheckingInPlayers((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Registered":
        return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-600";
      case "Checked In":
        return "bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-200 dark:border-green-600";
      case "Absent":
        return "bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-200 dark:border-red-600";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600";
    }
  };

  const getDisplayStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Manage Players
      </h2>

      <div className="space-y-4">
        <button
          onClick={() => setIsPlayersOpen(!isPlayersOpen)}
          className="flex items-center justify-between w-full text-left text-lg font-semibold mb-2 text-gray-900 dark:text-white"
        >
          <span>Players ({match.players?.length || 0})</span>
          {isPlayersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isPlayersOpen && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {match.players?.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No players registered.
              </p>
            ) : (
              match.players?.map((player) => (
                <div
                  key={player.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {player.player_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {player.details?.phone || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Slots: {player.number_of_slots || 1}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`inline-block px-2 py-1 text-sm font-medium rounded border ${getStatusStyles(player.player_status)}`}
                      >
                        {getDisplayStatus(player.player_status)}
                      </span>
                      {player.player_status === "Registered" && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="6-digit code"
                            value={checkinCodes[player.id] || ""}
                            onChange={(e) =>
                              handleCheckinCodeChange(player.id, e.target.value)
                            }
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            className="w-32 text-sm dark:bg-gray-700 dark:text-gray-100"
                            disabled={checkingInPlayers[player.id]}
                          />
                          <Button
                            onClick={() => handleCheckin(player.id)}
                            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded"
                            disabled={
                              !checkinCodes[player.id] ||
                              checkinCodes[player.id].length !== 6 ||
                              checkingInPlayers[player.id]
                            }
                          >
                            {checkingInPlayers[player.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>
                      )}
                      {checkinCodeErrors[player.id] && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {checkinCodeErrors[player.id]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Check-in Successful!</DialogTitle>
            <DialogDescription>
              {checkinPlayer && (
                <div className="text-center py-4">
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {checkinPlayer.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    has been successfully checked in for {checkinPlayer.slots} slot(s).
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setCheckinDialogOpen(false)}
              className="bg-green-500 hover:bg-green-600 text-white w-full"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;
