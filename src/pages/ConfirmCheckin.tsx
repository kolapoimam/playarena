import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { differenceInHours } from "date-fns";
import { z } from "zod";

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

// Validation schema for 6-digit numeric codes
const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

const ConfirmCheckin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [superCode, setSuperCode] = useState("");
  const [superCodeError, setSuperCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchNotFound, setMatchNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"confirm" | "checkin" | null>(null);
  const [playerStatuses, setPlayerStatuses] = useState<
    { id: string; status: string; checkinCode: string }[]
  >([]);
  const [checkinCodes, setCheckinCodes] = useState<{ [key: string]: string }>({});
  const [checkinCodeErrors, setCheckinCodeErrors] = useState<{ [key: string]: string | null }>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  const fetchMatch = async () => {
    // Validate super code
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      return;
    }
    setSuperCodeError(null);
    setMatchNotFound(false);

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

      if (!data) {
        setMatchNotFound(true);
        toast({
          title: "Match Not Found",
          description: `No match found with super code ${superCode}. Please check the code and try again.`,
          variant: "destructive",
        });
        return;
      }

      setMatch(data as Match);
      setPlayerStatuses(
        (data.players || []).map((player) => ({
          id: player.id,
          status: player.status,
          checkinCode: "",
        }))
      );
    } catch (error: any) {
      console.error("Error fetching match:", error.message, error.details || error);
      setMatchNotFound(true);
      toast({
        title: "Error",
        description: error.message.includes("0 rows") 
          ? `No match found with super code ${superCode}. Please check the code and try again.` 
          : "An error occurred while fetching the match. Please try again.",
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
    // Allow only numbers
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev) => ({ ...prev, [playerId]: numericCode }));
    // Validate in real-time
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev) => ({
      ...prev,
      [playerId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const validateCheckinCode = async (playerId: string) => {
    const code = checkinCodes[playerId];
    // Validate code format
    const validation = codeSchema.safeParse(code);
    if (!validation.success) {
      setCheckinCodeErrors((prev) => ({
        ...prev,
        [playerId]: validation.error.errors[0].message,
      }));
      toast({
        title: "Error",
        description: validation.error.errors[0].message,
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
      setCheckinCodeErrors((prev) => ({ ...prev, [playerId]: null }));
    } else {
      setCheckinCodeErrors((prev) => ({
        ...prev,
        [playerId]: "Invalid confirmation code",
      }));
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-300";
      case "pending":
        return "bg-red-100 text-red-700 border-red-300";
      case "checked_in":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "absent":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-playarena-500 to-playarena-700 text-white py-6 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <p className="text-sm mt-1 opacity-80">Manage player confirmations and check-ins</p>
      </div>

      <div className="max-w-4xl mx-auto p-4 -mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Enter Match Super Code</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter 6-digit super code"
                value={superCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  setSuperCode(value);
                  setSuperCodeError(null);
                  setMatchNotFound(false);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-full"
              />
              {superCodeError && (
                <p className="text-sm text-red-600 mt-1">{superCodeError}</p>
              )}
            </div>
            <Button
              className="bg-playarena-500 hover:bg-playarena-600 text-white px-6"
              onClick={fetchMatch}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Match"
              )}
            </Button>
          </div>
        </div>

        {matchNotFound && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-600">Match Not Found</h2>
            <p className="text-muted-foreground mt-2">
              No match found with super code <strong>{superCode}</strong>. Please check the code and try again.
            </p>
          </div>
        )}

        {match && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Match Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Trophy size={20} className="text-playarena-500" />
                  <div>
                    <p className="font-medium">{match.title}</p>
                    <p className="text-sm text-muted-foreground">Organized by {match.organizer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-playarena-500" />
                  <span>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-playarena-500" />
                  <span>{formatDate(match.match_date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-playarena-500" />
                  <span>{formatTime(match.match_time)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-playarena-500" />
                  <span>{match.players.length}/{match.total_slots} players</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button
                className="flex-1 bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleConfirmMode}
              >
                <CheckCircle size={18} className="mr-2" />
                Confirm Players
              </Button>
              <Button
                className="flex-1 bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleCheckinMode}
              >
                <Users size={18} className="mr-2" />
                Check-in Players
              </Button>
            </div>

            {mode === "confirm" && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Confirm Players</h2>
                {match.players.length > 0 ? (
                  <div className="space-y-3">
                    {match.players.map((player) => {
                      const currentStatus = playerStatuses.find((p) => p.id === player.id)?.status || player.status;
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-playarena-100 flex items-center justify-center text-playarena-600 font-semibold">
                              {player.player_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium">{player.player_name}</span>
                              <p className="text-sm text-muted-foreground">
                                Phone: {player.details?.phone || "N/A"}
                              </p>
                              <span
                                className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(currentStatus)}`}
                              >
                                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(player.id, "confirmed")}
                              disabled={currentStatus === "checked_in"}
                              className="hover:bg-green-100"
                            >
                              <CheckCircle
                                size={20}
                                className={currentStatus === "confirmed" ? "text-green-500" : "text-gray-500"}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(player.id, "pending")}
                              disabled={currentStatus === "checked_in"}
                              className="hover:bg-red-100"
                            >
                              <XCircle
                                size={20}
                                className={currentStatus === "pending" ? "text-red-500" : "text-gray-500"}
                              />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white mt-4"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No players have registered yet.</p>
                )}
              </div>
            )}

            {mode === "checkin" && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Check-in Players</h2>
                {match.players.filter((p) => p.status === "confirmed").length > 0 ? (
                  <div className="space-y-3">
                    {match.players
                      .filter((p) => p.status === "confirmed")
                      .map((player) => {
                        const currentStatus = playerStatuses.find((p) => p.id === player.id)?.status || player.status;
                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-playarena-100 flex items-center justify-center text-playarena-600 font-semibold">
                                {player.player_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium">{player.player_name}</span>
                                <p className="text-sm text-muted-foreground">
                                  Phone: {player.details?.phone || "N/A"}
                                </p>
                                <span
                                  className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(currentStatus)}`}
                                >
                                  {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                                </span>
                              </div>
                            </div>
                            {currentStatus !== "checked_in" && (
                              <div className="flex items-center gap-2">
                                <div className="w-28">
                                  <Input
                                    placeholder="6-digit code"
                                    value={checkinCodes[player.id] || ""}
                                    onChange={(e) =>
                                      handleCheckinCodeChange(player.id, e.target.value)
                                    }
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    className="h-9"
                                  />
                                  {checkinCodeErrors[player.id] && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {checkinCodeErrors[player.id]}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => validateCheckinCode(player.id)}
                                  className="hover:bg-blue-100"
                                >
                                  <CheckCircle size={20} className="text-blue-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    <Button
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white mt-4"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <Users size={18} className="mr-2" />
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
