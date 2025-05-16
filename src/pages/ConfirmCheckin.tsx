import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isPast, differenceInMinutes } from "date-fns";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import MatchCodeInput from "@/components/MatchCodeInput";
import MatchDetails from "@/components/MatchDetails";
import PlayerManagement from "@/components/PlayerManagement";

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
  }[] | null;
};

type Cashout = {
  id: string;
  match_id: string;
  super_code: string;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "under_review" | "processed" | "failed" | "successful";
  temp_identifier?: string;
};

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

const ConfirmCheckin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [superCode, setSuperCode] = useState("");
  const [superCodeError, setSuperCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [cashout, setCashout] = useState<Cashout | null>(null);
  const [matchNotFound, setMatchNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerStatuses, setPlayerStatuses] = useState<
    { id: string; status: string; checkinCode: string }[]
  >([]);
  const [checkinCodes, setCheckinCodes] = useState<{ [key: string]: string }>({});
  const [checkinCodeErrors, setCheckinCodeErrors] = useState<{ [key: string]: string | null }>({});
  const [tempIdentifier] = useState(uuidv4());
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentSuperCodes, setRecentSuperCodes] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      } else {
        setUserId(null);
      }
    };
    fetchUserId();
  }, []);

  const resetState = () => {
    setMatch(null);
    setCashout(null);
    setMatchNotFound(false);
    setPlayerStatuses([]);
    setCheckinCodes({});
    setCheckinCodeErrors({});
    setError(null);
  };

  const fetchMatch = async () => {
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      setMatchNotFound(false);
      resetState();
      return;
    }
    setSuperCodeError(null);
    setMatchNotFound(false);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, match_start_time, match_end_time, total_slots, organizer_name, super_code, is_paid, price, cancellation_status, status,
          venue:venues(name, city),
          players(id, player_name, status, confirmation_code, details)
        `)
        .eq("super_code", superCode)
        .single();

      if (error) throw error;

      if (!data) {
        setMatchNotFound(true);
        resetState();
        toast({
          title: "Match Not Found",
          description: `No match found with super code ${superCode}. Please check the code and try again.`,
          variant: "destructive",
        });
        return;
      }

      if (userId) {
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("organizer_id", userId)
          .single();

        if (!walletError && walletData) {
          setWalletBalance(walletData.balance);
        }
      }

      const matchData: Match = {
        ...data,
        venue: data.venue ? { name: data.venue.name ?? "Unknown Venue", city: data.venue.city ?? "Unknown City" } : null,
        players: Array.isArray(data.players) ? data.players : [],
        cancellation_status: data.cancellation_status ?? false,
        status: data.status ?? "upcoming",
      };

      setMatch(matchData);
      setPlayerStatuses(
        (matchData.players || []).map((player) => ({
          id: player.id,
          status: player.status,
          checkinCode: "",
        }))
      );

      try {
        const { data: cashoutData, error: cashoutError } = await supabase
          .from("cashouts")
          .select("*")
          .eq("super_code", superCode)
          .eq("match_id", matchData.id)
          .eq("temp_identifier", tempIdentifier)
          .maybeSingle();

        if (cashoutError) {
          if (cashoutError.code === "42703" && cashoutError.message.includes("temp_identifier")) {
            console.warn("temp_identifier column not found in cashouts table. Please run the migration to add this column.");
            setCashout(null);
            toast({
              title: "Warning",
              description: "Cashout information is unavailable due to a missing database column. Please contact support.",
              variant: "default",
            });
          } else {
            throw cashoutError;
          }
        } else {
          setCashout(cashoutData);
          if (!cashoutData) {
            console.log("No cashout data found for this match and tempIdentifier.");
          }
        }
      } catch (cashoutError: any) {
        console.error("Error fetching cashout:", cashoutError.message);
        setCashout(null);
        toast({
          title: "Error",
          description: "Failed to fetch cashout information. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching match:", error.message, error.details || error);
      setMatchNotFound(true);
      resetState();
      setError("An error occurred while fetching the match. Please try again.");
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

  const isMatchPast = match
    ? isPast(new Date(`${match.match_date}T${match.match_time}`))
    : false;

  const canConfirmPlayers = () => {
    if (!match || match.cancellation_status || isMatchPast) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesSinceStart = differenceInMinutes(now, matchDateTime);
    return minutesSinceStart <= 60;
  };

  const handleCancelMatch = async () => {
    if (!match || match.cancellation_status) return;

    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    if (minutesToStart <= 60) {
      toast({
        title: "Error",
        description: "Cannot cancel match within 1 hour of start time.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error: matchError } = await supabase
        .from("matches")
        .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
        .eq("id", match.id);

      if (matchError) throw matchError;

      const { error: playersError } = await supabase
        .from("players")
        .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
        .eq("match_id", match.id);

      if (playersError) throw playersError;

      toast({
        title: "Success",
        description: "Match cancelled successfully.",
      });
      await fetchMatch();
    } catch (error: any) {
      console.error("Error cancelling match:", error);
      toast({
        title: "Error",
        description: "Failed to cancel match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!match || match.match_start_time || match.cancellation_status) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("matches")
        .update({ match_start_time: now, status: "live" })
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match started successfully.",
      });
      await fetchMatch();
    } catch (error: any) {
      console.error("Error starting match:", error);
      toast({
        title: "Error",
        description: "Failed to start match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndMatch = async () => {
    if (!match || !match.match_start_time || match.match_end_time || match.cancellation_status) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("matches")
        .update({ match_end_time: now, status: "completed" })
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match ended successfully.",
      });
      await fetchMatch();
    } catch (error: any) {
      console.error("Error ending match:", error);
      toast({
        title: "Error",
        description: "Empty match cannot be ended. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resetState();
    if (superCode && codeSchema.safeParse(superCode).success) {
      fetchMatch();
    }
  }, [superCode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Manage Matches</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <MatchCodeInput
          superCode={superCode}
          setSuperCode={setSuperCode}
          superCodeError={superCodeError}
          setSuperCodeError={setSuperCodeError}
          setMatchNotFound={setMatchNotFound}
          loading={loading}
          setLoading={setLoading}
          fetchMatch={fetchMatch}
          userId={userId}
          recentSuperCodes={recentSuperCodes}
          setRecentSuperCodes={setRecentSuperCodes}
        />

        {loading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="animate-spin text-green-500" size={40} />
          </div>
        )}

        {error && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle size={40} className="text-red-600 dark:text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-500">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
        )}

        {matchNotFound && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle size={40} className="text-red-600 dark:text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-500">Match Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              No match found with super code <strong>{superCode}</strong>. Please check the code and try again.
            </p>
          </div>
        )}

        {match && !error && (
          <div className="animate-fade-in space-y-6">
            <MatchDetails
              match={match}
              cashout={cashout}
              handleCancelMatch={handleCancelMatch}
              handleStartMatch={handleStartMatch}
              handleEndMatch={handleEndMatch}
              loading={loading}
              isMatchPast={isMatchPast}
              walletBalance={walletBalance || 0}
            />
            <PlayerManagement
              match={match}
              tempIdentifier={tempIdentifier}
              playerStatuses={playerStatuses}
              setPlayerStatuses={setPlayerStatuses}
              checkinCodes={checkinCodes}
              setCheckinCodes={setCheckinCodes}
              checkinCodeErrors={checkinCodeErrors}
              setCheckinCodeErrors={setCheckinCodeErrors}
              fetchMatch={fetchMatch}
              loading={loading}
              setLoading={setLoading}
              isMatchPast={isMatchPast}
              canConfirmPlayers={canConfirmPlayers()}
              handleCancelMatch={handleCancelMatch}
            />
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default ConfirmCheckin;
