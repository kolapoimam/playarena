import { format, differenceInMinutes } from "date-fns";
import { Trophy, MapPin, Calendar, Clock, Users, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

type MatchDetailsProps = {
  match: Match | null;
  cashout: Cashout | null;
  handleCancelMatch: () => void;
  loading: boolean;
  isMatchPast: boolean;
  walletBalance?: number;
};

const MatchDetails = ({ match, cashout, handleCancelMatch, loading, isMatchPast, walletBalance }: MatchDetailsProps) => {
  const { toast } = useToast();

  const canCancelMatch = () => {
    if (!match) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    const hasCheckedInPlayers = match.players?.some(p => p.status === "Checked In") || false;
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
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "successful":
        return "bg-green-100 text-green-700 border-green-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "under_review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  const calculateExpectedAmount = () => {
    if (!match || !match.is_paid || !match.price) return "N/A";
    const checkedInPlayers = match.players?.filter(p => p.status === "Checked In").length || 0;
    return `₦${(checkedInPlayers * match.price).toLocaleString()}`;
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Match Details</h2>
        <div className="flex items-center gap-2">
          {match.cancellation_status && (
            <span className="inline-block px-3 py-1 text-sm font-medium rounded border bg-red-100 text-red-700 border-red-300">
              Cancelled
            </span>
          )}
          {cashout && (
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(cashout.status)}`}
            >
              Cashout: {cashout.status.replace("_", " ").charAt(0).toUpperCase() + cashout.status.replace("_", " ").slice(1)}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-green-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{match.title || "Untitled Match"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Organized by {match.organizer_name || "Unknown Organizer"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {match.venue?.name || "Unknown Venue"}, {match.venue?.city || "Unknown City"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">{match.match_date ? formatDate(match.match_date) : "Date TBD"}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">{match.match_time ? formatTime(match.match_time) : "Time TBD"}</span>
        </div>
        <div className="flex items-center gap-3">
          <Users size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">{(match.players || []).length}/{match.total_slots || 0} players</span>
        </div>
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {match.is_paid ? `₦${match.price?.toLocaleString() || "0"} per ticket` : "Free"}
          </span>
        </div>
        {walletBalance !== undefined && (
          <div className="flex items-center gap-3">
            <Wallet size={20} className="text-green-500" />
            <span className="text-gray-900 dark:text-gray-100">
              Wallet: ₦{walletBalance.toLocaleString() || "0"}
            </span>
          </div>
        )}
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
            Your cashout request is {cashout.status.replace("_", " ")}. Expected amount: {calculateExpectedAmount()}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mt-4">
        <Button
          onClick={handleCancel}
          className={`bg-red-500 hover:bg-red-600 text-white ${!canCancelMatch() ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!canCancelMatch() || loading}
        >
          Cancel Match
        </Button>
      </div>
    </div>
  );
};

export default MatchDetails;