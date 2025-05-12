import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader 
} from "lucide-react";
import { format } from "date-fns";
import { differenceInHours } from "date-fns";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  organizer_name: string;
  super_code: string;
  venue: {
    name: string;
    city: string;
  } | null;
  players: {
    id: string;
    player_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
  }[];
};

const ConfirmCheckin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [superCode, setSuperCode] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"confirm" | "checkin" | null>(null);
  const [playerStatuses, setPlayerStatuses] = useState<
    { id: string; status: string; checkinCode: string }[]
  >([]);
  const [checkinCodes, setCheckinCodes] = useState<{ [key: string]: string }>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  const fetchMatch = async () => {
    if (!superCode) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, total_slots, organizer_name, super_code,
          venue:venues(name, city),
          players(id, player_name, status, confirmation_code, details)
        `)
        .eq("super_code", superCode)
        .single();

      if (error) throw error;

      setMatch(data as Match);
      setPlayerStatuses(
        data.players.map((player) => ({
          id: player.id,
          status: player.status,
          checkinCode: "",
        }))
      );
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Invalid super code or match not found.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMode = () => {
    setMode("confirm");
  };

  const handleCheckinMode = () => {
    if (!match) return;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    if (differenceInHours(matchDateTime, now) > 2) {
      toast({
        title: "Check-in Not Available",
        description: "Check-in is only available 2 hours before the match starts.",
        variant: "destructive",
      });
      return;
    }
    setMode("checkin");
  };

  const handleStatusChange = (playerId: string, newStatus: string) => {
    setPlayerStatuses((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, status: newStatus } : p
      )
    );
  };

  const handleCheckinCodeChange = (playerId: string, code: string) => {
    setCheckinCodes((prev) => ({ ...prev, [playerId]: code }));
  };

  const validateCheckinCode = async (playerId: string) => {
    const code = checkinCodes[playerId];
    if (!code) {
      toast({
        title: "Error",
        description: "Please enter a confirmation code.",
        variant: "destructive",
      });
      return;
    }

    const player = match?.players.find((p) => p.id === playerId);
    if (player?.confirmation_code === code) {
      handleStatusChange(playerId, "checked_in");
      toast({
        title: "Success",
        description: `${player.player_name} has been checked in.`,
      });
      setCheckinCodes((prev) => ({ ...prev, [playerId]: "" }));
    } else {
      toast({
        title: "Error",
        description: "Invalid confirmation code.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!match) return;
    setLoading(true);
    try {
      for (const player of playerStatuses) {
        await supabase
          .from("players")
          .update({ status: player.status })
          .eq("id", player.id);
      }
      toast({
        title: "Success",
        description: "Player statuses updated successfully.",
      });
      // Refresh match data
      await fetchMatch();
    } catch (error) {
      console.error("Error saving statuses:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    return timeString.slice(0, 5);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-4">Confirm & Check-in Players</h1>

        <div className="mb-6">
          <Input
            placeholder="Enter match super code"
            value={superCode}
            onChange={(e) => setSuperCode(e.target.value)}
            className="mb-2"
          />
          <Button
            className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
            onClick={fetchMatch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} className="mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Fetch Match"
            )}
          </Button>
        </div>

        {match && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-semibold mb-3">Match Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{match.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} />
                  <span>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  <span>{formatDate(match.match_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  <span>{formatTime(match.match_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  <span>{match.players.length}/{match.total_slots} players</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleConfirmMode}
              >
                Confirm Players
              </Button>
              <Button
                className="flex-1 bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleCheckinMode}
              >
                Check-in Players
              </Button>
            </div>

            {mode === "confirm" && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-semibold mb-3">Confirm Players</h2>
                {match.players.length > 0 ? (
                  <div className="space-y-2">
                    {match.players.map((player) => {
                      const currentStatus = playerStatuses.find((p) => p.id === player.id)?.status || player.status;
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <div>
                            <span>{player.player_name}</span>
                            <p className="text-sm text-muted-foreground">
                              Phone: {player.details?.phone || "N/A"}
                            </p>
                            <Badge
                              variant={
                                currentStatus === "confirmed" ? "default" :
                                currentStatus === "pending" ? "destructive" :
                                currentStatus === "checked_in" ? "secondary" :
                                currentStatus === "absent" ? "outline" :
                                "default"
                              }
                            >
                              {currentStatus}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(player.id, "confirmed")}
                              disabled={currentStatus === "checked_in"}
                            >
                              <CheckCircle
                                size={18}
                                className={currentStatus === "confirmed" ? "text-green-500" : ""}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(player.id, "pending")}
                              disabled={currentStatus === "checked_in"}
                            >
                              <XCircle
                                size={18}
                                className={currentStatus === "pending" ? "text-red-500" : ""}
                              />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No players have registered yet.</p>
                )}
              </div>
            )}

            {mode === "checkin" && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-semibold mb-3">Check-in Players</h2>
                {match.players.filter((p) => p.status === "confirmed").length > 0 ? (
                  <div className="space-y-2">
                    {match.players
                      .filter((p) => p.status === "confirmed")
                      .map((player) => {
                        const currentStatus = playerStatuses.find((p) => p.id === player.id)?.status || player.status;
                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 bg-muted rounded-md"
                          >
                            <div>
                              <span>{player.player_name}</span>
                              <p className="text-sm text-muted-foreground">
                                Phone: {player.details?.phone || "N/A"}
                              </p>
                              <Badge
                                variant={
                                  currentStatus === "checked_in" ? "secondary" :
                                  currentStatus === "absent" ? "outline" :
                                  "default"
                                }
                              >
                                {currentStatus}
                              </Badge>
                            </div>
                            {currentStatus !== "checked_in" && (
                              <div className="flex gap-2 items-center">
                                <Input
                                  placeholder="Enter code"
                                  value={checkinCodes[player.id] || ""}
                                  onChange={(e) =>
                                    handleCheckinCodeChange(player.id, e.target.value)
                                  }
                                  className="w-24"
                                  ref={codeInputRef}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => validateCheckinCode(player.id)}
                                >
                                  <CheckCircle size={18} />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    <Button
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      Save Check-ins
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No confirmed players available for check-in.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default ConfirmCheckin;
