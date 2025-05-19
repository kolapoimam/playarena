import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/hooks/useWalletBalance";

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

type Cashout = {
  id: string;
  match_id: string;
  super_code: string;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  amount: number;
  temp_identifier?: string;
};

type MatchDetailsProps = {
  match: Match;
  cashout: Cashout | null;
  handleCancelMatch: () => void;
  loading: boolean;
  isMatchPast: boolean;
};

const MatchDetails = ({ match, cashout, handleCancelMatch, loading, isMatchPast }: MatchDetailsProps) => {
  const { toast } = useToast();
  const walletBalance = useWalletBalance(
    match?.id,
    match?.is_paid || false,
    match?.price,
    match?.status
  );

  const canCancelMatch = () => {
    if (!match || match.cancellation_status || isMatchPast) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    return minutesToStart > 0;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-700 border-green-300";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "Processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const calculateExpectedAmount = () => {
    if (!match.is_paid || !match.price) return 0;
    const checkedInPlayers = match.players?.filter((p) => p.player_status === "Checked In") || [];
    return checkedInPlayers.reduce(
      (sum, player) => sum + ((player.number_of_slots || 1) * (match.price || 0)),
      0
    );
  };

  const calculateTotalSlotsOccupied = () => {
    return match.players?.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) || 0;
  };

  const handleCancel = () => {
    if (!canCancelMatch()) {
      toast({
        title: "Cannot Cancel Match",
        description: "Match has started, ended, or is already cancelled.",
        variant: "destructive",
      });
      return;
    }
    handleCancelMatch();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{match.title}</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Date:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatDate(match.match_date)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Time:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatTime(match.match_time)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Venue:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {match.venue?.name || "Not specified"}
            {match.venue?.city ? `, ${match.venue.city}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Organizer:</span>
          <span className="text-gray-900 dark:text-gray-100">{match.organizer_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Super Code:</span>
          <span className="text-gray-900 dark:text-gray-100">{match.super_code}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Slots:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {calculateTotalSlotsOccupied()} / {match.total_slots}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">Type:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {match.is_paid ? `Paid (₦${match.price?.toLocaleString()})` : "Free"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            Wallet: ₦{walletBalance.toLocaleString()}
          </span>
        </div>
        {match.is_paid && (
          <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400">Expected Amount:</span>
            <span className="text-gray-900 dark:text-gray-100">
              ₦{calculateExpectedAmount().toLocaleString()}
            </span>
          </div>
        )}
        {cashout && (
          <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400">Cashout Status:</span>
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(
                cashout.status
              )}`}
            >
              {cashout.status}
            </span>
          </div>
        )}
      </div>
      {canCancelMatch() && (
        <Button
          onClick={handleCancel}
          className="mt-4 bg-red-500 hover:bg-red-600 text-white"
          disabled={loading}
        >
          Cancel Match
        </Button>
      )}
    </div>
  );
};

export default MatchDetails;
