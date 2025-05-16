import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { differenceInMinutes } from "date-fns";

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

const bankAccountSchema = z
  .string()
  .regex(/^\d{10}$/, { message: "Bank account number must be exactly 10 digits" });

const accountNameSchema = z
  .string()
  .regex(/^[A-Za-z\s]+$/, { message: "Account name must contain only letters and spaces" })
  .min(2, { message: "Account name must be at least 2 characters" });

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
  playerStatuses: { id: string; status: string; checkinCode: string }[];
  setPlayerStatuses: (statuses: { id: string; status: string; checkinCode: string }[]) => void;
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
}: PlayerManagementProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"confirm" | "checkin" | "cashout" | null>(null);
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);

  const hasCheckedInPlayers = () => {
    return match?.players?.some(p => p.status === "checked_in") || false;
  };

  const isCashoutEligible = () => {
    if (!match || match.cancellation_status) return false;
    if (!match.is_paid) return false;
    const checkedInPlayers = match.players?.filter(p => p.status === "checked_in").length || 0;
    return checkedInPlayers > 0;
  };

  const canCancelMatch = () => {
    if (!match || match.cancellation_status) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    return minutesToStart > 60;
  };

  const handleConfirmMode = () => {
    setMode("confirm");
  };

  const handleCheckinMode = () => {
    if (!match || match.cancellation_status) return;
    
    const now = new Date();
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const matchEndTime = match.match_end_time ? new Date(match.match_end_time) : 
      new Date(matchDateTime.getTime() + 2 * 60 * 60 * 1000);
    
    if (now > matchEndTime) {
      toast({
        title: "Check-in Period Ended",
        description: "Check-in is no longer available as the match has ended.",
        variant: "destructive",
      });
      return;
    }

    if (differenceInMinutes(matchDateTime, now) > 120) {
      toast({
        title: "Check-in Not Available",
        description: "Check-in is only available 2 hours before the match starts.",
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
        description: "Cashout is only available 30 minutes before the match starts for paid matches with checked-in players.",
        variant: "destructive",
      });
      return;
    }
    setCashoutDialogOpen(true);
  };

  const handleCashoutSubmit = async () => {
    if (!match) return;

    const bankAccountValidation = bankAccountSchema.safeParse(bankAccountNumber);
    const accountNameValidation = accountNameSchema.safeParse(accountName);

    if (!bankAccountValidation.success) {
      setBankAccountError(bankAccountValidation.error.errors[0].message);
      return;
    }
    if (!accountNameValidation.success) {
      setAccountNameError(accountNameValidation.error.errors[0].message);
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

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cashouts")
        .insert({
          match_id: match.id,
          super_code: match.super_code,
          bank_account_number: bankAccountNumber,
          bank_name: bankName,
          account_name: accountName,
          status: "under_review",
          temp_identifier: tempIdentifier,
        })
        .select()
        .single();

      if (error) throw error;

      setCashoutDialogOpen(false);
      setBankAccountNumber("");
      setBankName("");
      setAccountName("");
      setBankAccountError(null);
      setAccountNameError(null);
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

  const handleStatusChange = (playerId: string, newStatus: string) => {
    setPlayerStatuses((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, status: newStatus } : p
      )
    );
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
      case "successful":
        return "bg-green-100 text-green-700 border-green-300";
      case "pending":
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "checked_in":
      case "processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "absent":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "under_review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  if (!match) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Players</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <Button
          onClick={handleConfirmMode}
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={!canConfirmPlayers || match.cancellation_status}
        >
          Confirm Players
        </Button>
        <Button
          onClick={handleCheckinMode}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          disabled={isMatchPast || match.cancellation_status}
        >
          Check-in Players
        </Button>
        <Button
          onClick={handleCancelMatch}
          className={`bg-red-500 hover:bg-red-600 text-white ${!canCancelMatch() ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!canCancelMatch() || loading}
        >
          Cancel Match
        </Button>
        {!match.is_paid ? (
          <div className="flex items-center text-red-600 dark:text-red-400">
            Not eligible for cashout. All players will be refunded.
          </div>
        ) : (
          <Button
            onClick={handleCashoutMode}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={!isCashoutEligible() || match.cancellation_status}
          >
            Request Cashout
          </Button>
        )}
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
              match.players?.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{player.player_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: {player.details?.phone || "Not provided"}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(player.status)}`}
                    >
                      {player.status.replace("_", " ").charAt(0).toUpperCase() + player.status.replace("_", " ").slice(1)}
                    </span>
                    {mode === "checkin" && player.status === "checked_in" && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Check-in code: {player.confirmation_code}
                      </p>
                    )}
                  </div>
                  {mode === "confirm" && (
                    <Select
                      value={playerStatuses.find((p) => p.id === player.id)?.status || player.status}
                      onValueChange={(value) => handleStatusChange(player.id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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
                      />
                      <Button
                        onClick={() => validateCheckinCode(player.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={!!checkinCodeErrors[player.id] || !checkinCodes[player.id]}
                      >
                        Verify
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

      {(mode === "confirm" || mode === "checkin") && (
        <Button
          onClick={handleSave}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      )}

      <Dialog open={cashoutDialogOpen} onOpenChange={setCashoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Cashout</DialogTitle>
            <DialogDescription>
              Enter your bank details to request a cashout for this match. You may need to log in later to verify your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Select onValueChange={setBankName} value={bankName}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <DialogFooter>
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
    </div>
  );
};

export default PlayerManagement;
