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
  AlertCircle,
  Trophy,
  DollarSign,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMinutes, isPast } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  is_paid: boolean;
  price?: number;
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
  user_id: string;
};

// Validation schemas
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

// List of Nigerian banks
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

const ConfirmCheckin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [superCode, setSuperCode] = useState("");
  const [superCodeError, setSuperCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [cashout, setCashout] = useState<Cashout | null>(null);
  const [matchNotFound, setMatchNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"confirm" | "checkin" | "cashout" | null>(null);
  const [playerStatuses, setPlayerStatuses] = useState<
    { id: string; status: string; checkinCode: string }[]
  >([]);
  const [checkinCodes, setCheckinCodes] = useState<{ [key: string]: string }>({});
  const [checkinCodeErrors, setCheckinCodeErrors] = useState<{ [key: string]: string | null }>({});
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentSuperCodes, setRecentSuperCodes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);

  // Check authentication status and fetch recent super codes for logged-in users
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
        // Fetch recent super codes for logged-in user
        const { data, error } = await supabase
          .from("matches")
          .select("super_code")
          .eq("organizer_id", session.session.user.id)
          .order("created_at", { ascending: false })
          .limit(3);
        if (error) {
          console.error("Error fetching recent super codes:", error);
          toast({
            title: "Error",
            description: "Failed to load recent super codes.",
            variant: "destructive",
          });
        } else {
          setRecentSuperCodes(data.map((match) => match.super_code));
        }
      }
    };
    checkAuth();
  }, [toast]);

  const resetState = () => {
    setMatch(null);
    setCashout(null);
    setMatchNotFound(false);
    setMode(null);
    setPlayerStatuses([]);
    setCheckinCodes({});
    setCheckinCodeErrors({});
    setCashoutDialogOpen(false);
    setBankAccountNumber("");
    setBankName("");
    setAccountName("");
    setBankAccountError(null);
    setAccountNameError(null);
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
      // Fetch match without restricting to organizer_id for non-logged-in users
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, total_slots, organizer_name, super_code, is_paid, price,
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

      const matchData: Match = {
        ...data,
        venue: data.venue ? { name: data.venue.name ?? "Unknown Venue", city: data.venue.city ?? "Unknown City" } : null,
        players: Array.isArray(data.players) ? data.players : [],
      };

      setMatch(matchData);
      setPlayerStatuses(
        (matchData.players || []).map((player) => ({
          id: player.id,
          status: player.status,
          checkinCode: "",
        }))
      );

      // Fetch cashout status if user is logged in
      if (userId) {
        const { data: cashoutData, error: cashoutError } = await supabase
          .from("cashouts")
          .select("*")
          .eq("super_code", superCode)
          .eq("match_id", matchData.id)
          .eq("user_id", userId)
          .single();

        if (cashoutError && !cashoutError.message.includes("0 rows")) {
          console.error("Error fetching cashout:", cashoutError);
        }

        setCashout(cashoutData);
      }
    } catch (error: any) {
      console.error("Error fetching match:", error.message, error.details || error);
      setMatchNotFound(true);
      resetState();
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

  useEffect(() => {
    if (superCode && codeSchema.safeParse(superCode).success) {
      fetchMatch();
    } else {
      resetState();
    }
  }, [superCode]);

  const isMatchStarted = () => {
    if (!match) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    return isPast(matchDateTime);
  };

  const isCashoutEligible = () => {
    if (!match || !userId) return false;
    if (!match.is_paid) return false;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDateTime, now);
    return minutesToStart <= 30 && minutesToStart >= -30;
  };

  const handleConfirmMode = () => {
    if (isMatchStarted()) {
      toast({
        title: "Action Not Available",
        description: "This match has passed. No further actions are allowed.",
        variant: "destructive",
      });
      return;
    }
    setMode("confirm");
  };

  const handleCheckinMode = () => {
    if (!match) return;
    if (isMatchStarted()) {
      toast({
        title: "Action Not Available",
        description: "This match has passed. No further actions are allowed.",
        variant: "destructive",
      });
      return;
    }
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
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
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request a cashout.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    if (!isCashoutEligible()) {
      toast({
        title: "Cashout Not Available",
        description: "Cashout is only available 30 minutes before the match starts for paid matches.",
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
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setCashout(data);
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
      case "under_review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "successful":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  const calculateExpectedAmount = () => {
    if (!match || !match.is_paid || !match.price) return "N/A";
    const checkedInPlayers = match.players?.filter(p => p.status === "checked_in").length || 0;
    return `₦${(checkedInPlayers * (match.price || 5000)).toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Enter Match Super Code</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              {userId && recentSuperCodes.length > 0 ? (
                <div className="relative">
                  <Select
                    onValueChange={(value) => {
                      setSuperCode(value);
                      setSuperCodeError(null);
                      setMatchNotFound(false);
                    }}
                    value={superCode}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="Select or enter super code" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentSuperCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="w-full text-base mt-2"
                    ref={codeInputRef}
                  />
                </div>
              ) : (
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
                  className="w-full text-base"
                  ref={codeInputRef}
                />
              )}
              {superCodeError && (
                <p className="text-sm text-red-600 mt-1">{superCodeError}</p>
              )}
            </div>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle size={40} className="text-red-600 dark:text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-500">Match Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              No match found with super code <strong>{superCode}</strong>. Please check the code and try again.
            </p>
          </div>
        )}

        {match && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Match Details</h2>
                {cashout && (
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(cashout.status)}`}
                  >
                    Cashout: {cashout.status.replace("_", " ").charAt(0).toUpperCase() + cashout.status.replace("_", " ").slice(1)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <span className="text-gray-900 dark:text-gray-100">{match.is_paid ? "Paid" : "Free"}</span>
                </div>
              </div>
              {cashout && cashout.status === "under_review" && (
                <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Your cashout request is under review. Expected amount: {calculateExpectedAmount()}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Players</h2>
              <div className="flex flex-wrap gap-4 mb-4">
                <Button
                  onClick={handleConfirmMode}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  disabled={isMatchStarted()}
                >
                  Confirm Players
                </Button>
                <Button
                  onClick={handleCheckinMode}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={isMatchStarted()}
                >
                  Check-in Players
                </Button>
                {match.is_paid && (
                  <Button
                    onClick={handleCashoutMode}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    disabled={!isCashoutEligible()}
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
            </div>
          </div>
        )}

        <Dialog open={cashoutDialogOpen} onOpenChange={setCashoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Cashout</DialogTitle>
              <DialogDescription>
                Enter your bank details to request a cashout for this match. The expected amount is {calculateExpectedAmount()}.
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
      <Navbar />
    </div>
  );
};

export default ConfirmCheckin;
