import { useState, useEffect, useCallback } from "react";
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
  amount: number;
  temp_identifier?: string;
};

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });
const bankAccountSchema = z.string().regex(/^\d{10}$/, { message: "Bank account number must be exactly 10 digits" });
const accountNameSchema = z.string().regex(/^[A-Za-z\s]+$/, { message: "Account name must contain only letters and spaces" }).min(2, { message: "Account name must be at least 2 characters" });
const amountSchema = z.number().min(1, { message: "Amount must be at least 1" }).positive({ message: "Amount must be positive" });

const nigerianBanks = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTB)", "Heritage Bank", "Keystone Bank", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank",
  "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
  "Unity Bank", "Wema Bank", "Zenith Bank", "SunTrust Bank Nigeria Limited",
  "Parallex Bank", "TAJ Bank", "Lotus Bank", "Opay (Paycom MFB)",
  "PalmPay (PalmPay Ltd. MFB)", "Moniepoint MFB", "Kuda Bank (Kuda MFB)",
  "Rubies Bank (Rubies MFB)", "Sparkle MFB", "VFD MFB", "FairMoney MFB",
  "Carbon (One Finance MFB)", "Mint MFB", "Eyowo MFB", "GoMoney (Go Financial Services)",
  "ALAT by Wema", "Branch MFB", "9Pay MFB", "MKOBO MFB", "PayDay (Africhange Technologies)",
  "Chipper Cash (Chipper Technologies)", "Paga", "NowNow MFB"
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
  const [cashoutRequests, setCashoutRequests] = useState<Cashout[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchUserIdAndData = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      } else {
        setUserId(null);
      }

      if (!match || !userId) {
        setWalletBalance(0);
        setCashoutRequests([]);
        return;
      }

      try {
        // Fetch fresh player data from Supabase for wallet balance calculation
        const { data: playersData, error: playersError } = await supabase