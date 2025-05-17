import { useState, useEffect } from "react";
import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
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
    status: string;
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
  status: "under_review" | "processed" | "failed" | "successful";
  temp_identifier?: string;
};

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

const bankAccountSchema = z
  .string()
  .regex(/^\d{10}$/, { message: "Bank account number must be exactly 10 digits" });

const accountNameSchema = z
  .string()
  .regex(/^[A-Za-z\s]+$/, { message: "Account name must contain only letters and spaces" })
  .min(2, { message: "Account name must be at least 2 characters" });

const amountSchema = z
  .number()
  .min(1, { message: "Amount must be at least 1" })
  .positive({ message: "Amount must be positive" });

const nigerianBanks = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTB)",
  "Heritage Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
  "SunTrust Bank Nigeria Limited",
  "Parallex Bank",
  "TAJ Bank",
  "Lotus Bank",
  "Opay (Paycom MFB)",
  "PalmPay (PalmPay Ltd. MFB)",
  "Moniepoint MFB",
  "Kuda Bank (Kuda MFB)",
  "Rubies Bank (Rubies MFB)",
  "Sparkle MFB",
  "VFD MFB",
  "FairMoney MFB",
  "Carbon (One Finance MFB)",
  "Mint MFB",
  "Eyowo MFB",
  "GoMoney (Go Financial Services)",
  "ALAT by Wema",
  "Branch MFB",
  "9Pay MFB",
  "MKOBO MFB",
  "PayDay (Africhange Technologies)",
  "Chipper Cash (Chipper Technologies)",
  "Paga",
  "NowNow MFB",
];

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
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinPlayer, setCheckinPlayer] = useState<{ name: string; slots: number } | null>(null);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [cashoutRequests, setCashoutRequests] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingInPlayers, setCheckingInPlayers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchUserIdAndData = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      } else {
        setUserId(null);
      }

      if (!match || !userId) return;
      
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("organizer_id",かく); setUserId(null);
      }

      if (!match || !userId) return;
      
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("organizer_id", userId)
        .single();

      if (!walletError && walletData) {
        setWalletBalance(walletData.balance);
      }

      const { data: cashoutData, error: cashoutError } = await supabase
        .from("cashout_requests")
        .select("*")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false });

      if (!cashoutError && cashoutData) {
        setCashoutRequests(cashoutData);
      }
    };

    fetchUserIdAndData();
  }, [match, userId]);

  const hasCheckedInPlayers = () => {
    return match?.players?.some(p => p.player_status === 'Checked In') || false;
  };

  const isCashoutEligible = () => {
    if (!match || match.cancellation_status || !match.is_paid) return false;
    const checkedInPlayers = match.players?.filter(p => p.player_status === 'Checked In').length || 0;
    return checkedInPlayers > 0 && walletBalance > 0;
  };

  const canCheckin = () => {
    if (!match || match.cancellation_status || !match.players?.length) {
      console.log("canCheckin failed:", {
        hasMatch: !!match,
        cancellationStatus: match?.cancellation_status,
        playersLength: match?.players?.length
      });
      return false;
    }
    const now = new Date();
    let matchEndTime: Date;
    try {
      if (match.match_end_time) {
        matchEndTime = new Date(match.match_end_time);
      } else {
        matchEndTime = addHours(new Date(`${match.match_date}T${match.match_time}`), 2);
      }
      if (isNaN(matchEndTime.getTime())) {
        console.warn("Invalid match end time detected, using fallback time (03:00 PM WAT today)");
        matchEndTime = new Date("2025-05-17T15:00:00+01:00"); // 03:00 PM WAT fallback
      }
    } catch (error) {
      console.error("Error calculating matchEndTime:", error, {
        matchEndTime: match.match_end_time,
        matchDate: match.match_date,
        matchTime: match.match_time
      });
      matchEndTime = new Date("2025-05-17T15:00:00+01:00"); // Fallback to 03:00 PM WAT
    }
    const isEndTimeFuture = !isPast(matchEndTime);
    console.log("canCheckin Debug:", {
      matchId: match.id,
      cancellationStatus: match.cancellation_status,
      playersLength: match.players?.length,
      matchEndTimeRaw: match.match_end_time,
      matchDate: match.match_date,
      matchTime: match.match_time,
      matchEndTime: matchEndTime.toISOString(),
      isEndTimeFuture,
      now: now.toISOString()
    });
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

  const handleCashoutMode = () => {
    if (!isCashoutEligible()) {
      toast({
        title: "Cashout Not Available",
        description: match.is_paid 
          ? "Cashout requires at least one checked-in player and a positive wallet balance."
          : "Cashout is not available for free matches.",
        variant: "destructive",
      });
      return;
    }
    setCashoutDialogOpen(true);
  };

  const handleCashoutSubmit = async () => {
    if (!match || !userId) return;

    const bankAccountValidation = bankAccountSchema.safeParse(bankAccountNumber);
    const accountNameValidation = accountNameSchema.safeParse(accountName);
    const amountValidation = amountSchema.safeParse(Number(cashoutAmount));

    if (!bankAccountValidation.success) {
      setBankAccountError(bankAccountValidation.error.errors[0].message);
      return;
    }
    if (!accountNameValidation.success) {
      setAccountNameError(accountNameValidation.error.errors[0].message);
      return;
    }
    if (!amountValidation.success) {
      setAmountError(amountValidation.error.errors[0].message);
      return;
    }
    if (!bankName) {
      toast({
        title: "Error",
        description: "Please select a bank.",
        variant: "destructive",
      });
      return;
    }
    if (Number(cashoutAmount) > walletBalance) {
      setAmountError("Amount exceeds available wallet balance");
      return;
    }

    setLoading(true);
    try {
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("organizer_id", userId)
        .single();

      if (walletError || !walletData) throw new Error("Failed to fetch wallet balance");

      const newBalance = walletData.balance - Number(cashoutAmount);
      if (newBalance < 0) throw new Error("Insufficient funds");

      const { error: cashoutError } = await supabase
        .from("cashout_requests")
        .insert({
          organizer_id: userId,
          match_id: match.id,
          amount: Number(cashoutAmount),
          account_details: {
            bank_account_number: bankAccountNumber,
            bank_name: bankName,
            account_name: accountName,
          },
          status: "review",
          temp_identifier: tempIdentifier,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (cashoutError) throw cashoutError;

      const { error: walletUpdateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("organizer_id", userId);

      if (walletUpdateError) throw walletUpdateError;

      const { data: cashoutData, error: cashoutFetchError } = await supabase
        .from("cashout_requests")
        .select("*")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false });

      if (!cashoutFetchError && cashoutData) {
        setCashoutRequests(cashoutData);
      }

      setCashoutDialogOpen(false);
      setBankAccountNumber("");
      setBankName("");
      setAccountName("");
      setCashoutAmount("");
      setBankAccountError(null);
      setAccountNameError(null);
      setAmountError(null);
      setWalletBalance(newBalance);
      toast({
        title: "Success",
        description: "Cashout request submitted successfully. It is now under review.",
      });
      fetchMatch();
    } catch (error) {
      console.error("Error submitting cashout:", error);
      toast({
        title: "Error",
        description: "Failed to submit cashout request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

    const player = match?.players?.find((p) => p.id === playerId);
    if (!player) {
      console.error("Player not found:", playerId);
      toast({
        title: "Error",
        description: "Player not found.",
        variant: "destructive",
      });
      return;
    }

    if (player.player_status === 'Checked In' || playerStatuses.find(p => p.id === playerId)?.status === 'Checked In') {
      console.warn("Attempted to check in already checked-in player:", playerId);
      toast({
        title: "Error",
        description: "Player is already checked in. This action cannot be undone.",
        variant: "destructive",
      });
      return;
    }

    if (player.player_status === 'Absent') {
      console.warn("Attempted to check in absent player:", playerId);
      toast({
        title: "Error",
        description: "Player is marked absent and cannot be checked in after the match has ended.",
        variant: "destructive",
      });
      return;
    }

    if (player.confirmation_code !== code) {
      console.log("Invalid check-in code for player:", playerId, { entered: code, expected: player.confirmation_code });
      setCheckinCodeErrors((prev) => ({
        ...prev,
        [playerId]: "Invalid confirmation code",
      }));
      toast({
        title: "Error",
        description: "Invalid confirmation code.",
        variant: "destructive",
      });
      return;
    }

    setCheckingInPlayers((prev) => ({ ...prev, [playerId]: true }));
    try {
      console.log("Initiating check-in for player:", { playerId, playerName: player.player_name, code });

      // Verify player exists in Supabase
      const { data: playerCheck, error: playerCheckError } = await supabase
        .from("players")
        .select("id, player_status, number_of_slots")
        .eq("id", playerId)
        .eq("match_id", match!.id)
        .single();

      if (playerCheckError || !playerCheck) {
        console.error("Player verification failed:", playerCheckError?.message || "No player found");
        throw new Error("Player not found in database");
      }

      if (playerCheck.player_status === 'Checked In') {
        console.warn("Player already checked in on server:", playerId);
        throw new Error("Player is already checked in");
      }

      if (playerCheck.player_status === 'Absent') {
        console.warn("Player marked absent on server:", playerId);
        throw new Error("Player is marked absent and cannot be checked in");
      }

      // Attempt to update player_status with retries
      let updateError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Attempt ${attempt} to update player status for player:`, playerId);
        const { error } = await supabase
          .from("players")
          .update({
            status: "checked_in",
            player_status: 'Checked In',
            updated_at: new Date().toISOString()
          })
          .eq("id", playerId);

        if (!error) {
          updateError = null;
          break;
        }
        updateError = error;
        console.warn(`Attempt ${attempt} to update player status failed:`, {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details
        });
        if (updateError.code === "403") {
          console.error("Permission denied for update:", updateError);
          break; // No retry for permission errors
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
      }

      if (updateError) {
        console.error("Failed to update player status after retries:", updateError);
        throw new Error(`Failed to update player status: ${updateError.message}`);
      }

      // Update local state optimistically
      setPlayerStatuses((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, status: 'Checked In' } : p
        )
      );

      // Show confirmation dialog
      setCheckinPlayer({
        name: player.player_name,
        slots: playerCheck.number_of_slots || 1
      });
      setCheckinDialogOpen(true);

      // Clear input and errors
      setCheckinCodes((prev) => ({ ...prev, [playerId]: "" }));
      setCheckinCodeErrors((prev) => ({ ...prev, [playerId]: null }));

      // Re-fetch match to sync UI
      console.log("Re-fetching match data to sync UI for player:", playerId);
      await fetchMatch();

      console.log("Check-in successful for player:", playerId);
      toast({
        title: "Success",
        description: `${player.player_name} has been checked in with ${playerCheck.number_of_slots || 1} slot(s). This action is irreversible.`,
      });
    } catch (error: any) {
      console.error("Error checking in player:", {
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: error.message || "Failed to check in player. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingInPlayers((prev) => ({ ...prev, [playerId]: false }));
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Registered':
        return "bg-yellow-500 text-white border-yellow-600";
      case 'Checked In':
        return "bg-green-500 text-white border-green-600";
      case 'Absent':
        return "bg-red-500 text-white border-red-600";
      case "successful":
        return "bg-green-100 text-green-700 border-green-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "under_review":
      case "review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Players</h2>
      
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Wallet Balance: ₦{walletBalance.toFixed(2)}
        </p>
      </div>

      <div className="flex gap-3 mb-4">
        <Button
          onClick={handleCheckinMode}
          className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
          disabled={!canCheckin() || match.cancellation_status}
        >
          Check-in Players
        </Button>
        <Button
          onClick={handleCashoutMode}
          className={`bg-yellow-500 hover:bg-yellow-600 text-white flex-1 ${!isCashoutEligible() ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!isCashoutEligible() || match.cancellation_status}
        >
          Request Cashout
        </Button>
      </div>

      {cashoutRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Cashout Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Bank Details</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created At</th>
                </tr>
              </thead>
              <tbody>
                {cashoutRequests.map((request) => (
                  <tr key={request.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-4 py-2">₦{request.amount.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      {request.account_details.account_name} <br />
                      {request.account_details.bank_account_number} ({request.account_details.bank_name})
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded ${getStatusStyles(request.status)}`}>
                        {request.status.replace("_", " ").charAt(0).toUpperCase() + request.status.replace("_", " ").slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2">{new Date(request.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              match.players?.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{player.player_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: {player.details?.phone || "Not provided"}
                      {player.player_status === 'Checked In' && (
                        <span> | Code: {player.confirmation_code}</span>
                      )}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(player.player_status)}`}
                    >
                      {player.player_status}
                    </span>
                  </div>
                  {mode === "checkin" && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Enter check-in code"
                        value={checkinCodes[player.id] || ""}
                        onChange={(e) => handleCheckinCodeChange(player.id, e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="w-full sm:w-[150px]"
                        disabled={player.player_status !== 'Registered' || checkingInPlayers[player.id]}
                      />
                      <Button
                        onClick={() => validateCheckinCode(player.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={!!checkinCodeErrors[player.id] || !checkinCodes[player.id] || player.player_status !== 'Registered' || checkingInPlayers[player.id]}
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
              ))
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

      <Dialog open={cashoutDialogOpen} onOpenChange={setCashoutDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Request Cashout</DialogTitle>
            <DialogDescription>
              Enter your bank details and amount to request a cashout for this match. Amount must not exceed your wallet balance (₦{walletBalance.toFixed(2)}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount (₦)
              </label>
              <Input
                type="number"
                value={cashoutAmount}
                onChange={(e) => {
                  setCashoutAmount(e.target.value);
                  setAmountError(null);
                }}
                className="mt-1"
                min="1"
              />
              {amountError && (
                <p className="text-sm text-red-600 mt-1">{amountError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bank Account Number
              </label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => {
                  setBankAccountNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                  setBankAccountError(null);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className="mt-1"
              />
              {bankAccountError && (
                <p className="text-sm text-red-600 mt-1">{bankAccountError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bank Name
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select a bank</option>
                {nigerianBanks.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Name
              </label>
              <Input
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  setAccountNameError(null);
                }}
                className="mt-1"
              />
              {accountNameError && (
                <p className="text-sm text-red-600 mt-1">{accountNameError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setCashoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashoutSubmit}
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Cashout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

<Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
  <DialogContent className="max-w-xs rounded-2xl p-6">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold text-center">
        Check-in Successful
      </DialogTitle>
      <DialogDescription className="text-sm text-center mt-2">
        {checkinPlayer && (
          <>
            Successfully checked in {checkinPlayer.name} with {checkinPlayer.slots} slot{checkinPlayer.slots !== 1 ? 's' : ''}.
          </>
        )}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="mt-4 flex justify-center">
      <Button
        onClick={() => setCheckinDialogOpen(false)}
        className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-2"
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
