
import { BalanceHero, CashoutDialog, CashoutList } from "@/components/sc/CashoutUI";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { organiserRate, payout, type Payout } from "@/lib/fees";
import { v4 as uuidv4 } from "uuid";

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

type CashoutRequest = {
  id: string;
  match_id: string;
  super_code: string;
  amount: number;
  account_details: {
    bank_account_number: string;
    bank_name: string;
    account_name: string;
  } | null | undefined;
  status: "Review" | "Processed" | "Successful" | "Failed";
  temp_identifier?: string;
  created_at: string;
};

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

type OrganizerCashoutProps = {
  match: Match | null;
  tempIdentifier: string;
};

const OrganizerCashout = ({ match, tempIdentifier }: OrganizerCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<Payout | null>(null);
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localTempIdentifier, setLocalTempIdentifier] = useState<string>(tempIdentifier);

  // Ensure tempIdentifier is set
  useEffect(() => {
    const stored = localStorage.getItem('tempIdentifier');
    if (!stored && !localTempIdentifier) {
      const newId = uuidv4();
      localStorage.setItem('tempIdentifier', newId);
      setLocalTempIdentifier(newId);
    } else if (stored && !localTempIdentifier) {
      setLocalTempIdentifier(stored);
    }
  }, [localTempIdentifier]);

  const fetchWalletData = useCallback(async () => {
    if (!match || !match.id) {
      setWalletBalance(0);
      setCashoutRequests([]);
      return;
    }

    try {
      // Fetch player data
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("player_status, number_of_slots")
        .eq("match_id", match.id);

      if (playersError) throw playersError;

      let balance = 0;
      if (match.is_paid && match.price) {
        const checkedInPlayers = playersData.filter((p) => p.player_status === "Checked In");
        balance = checkedInPlayers.reduce(
          (sum, player) => sum + ((player.number_of_slots || 1) * (match.price || 0)),
          0
        );
      }

      // Add ticket revenue if selling tickets
      if (match.sell_tickets && match.ticket_price) {
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select("number_of_tickets")
          .eq("match_id", match.id)
          .eq("checked_in", true);

        if (ticketsError) throw ticketsError;

        const ticketRevenue = ticketsData.reduce(
          (sum, ticket) => sum + (ticket.number_of_tickets * (match.ticket_price || 0)),
          0
        );
        balance += ticketRevenue;
      }

      // Subtract cashout amounts for Review, Processed, and Successful statuses
      const { data: cashoutData, error: cashoutError } = await supabase
        .from("cashout_requests")
        .select("amount, status")
        .eq("match_id", match.id)
        .in("status", ["Review", "Processed", "Successful"]);

      if (cashoutError) throw cashoutError;

      // What is left after the platform fee and earlier cashouts
      const requested = (cashoutData || []).reduce((sum, request) => sum + (request.amount || 0), 0);
      const { rate, note } = await organiserRate(match.id);
      const p = payout(balance, rate, requested, note);
      setBreakdown(p);
      setWalletBalance(p.available);
    } catch (error) {
      console.error("Error fetching data for wallet balance:", error);
      toast({
        title: "Error",
        description: "Failed to calculate wallet balance.",
        variant: "destructive",
      });
      setWalletBalance(0);
    }
  }, [match, toast]);

  const fetchCashoutRequests = useCallback(async () => {
    if (!match || !match.id) {
      setCashoutRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("cashout_requests")
        .select("*")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our CashoutRequest type
      const transformedData: CashoutRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        match_id: item.match_id,
        super_code: item.super_code || '',
        amount: item.amount,
        account_details: item.account_details,
        status: item.status,
        temp_identifier: item.temp_identifier,
        created_at: item.created_at,
      }));

      setCashoutRequests(transformedData);
    } catch (error) {
      console.error("Error fetching cashout requests:", error);
      toast({
        title: "Error",
        description: "Failed to load cashout requests.",
        variant: "destructive",
      });
      setCashoutRequests([]);
    }
  }, [match, toast]);

  useEffect(() => {
    if (!match || !localTempIdentifier) {
      setWalletBalance(0);
      setCashoutRequests([]);
      return;
    }
    fetchWalletData();
    fetchCashoutRequests();

    // Live updates when a cashout or ticket changes
    const cashoutChannel = supabase
      .channel(`cashout_requests_match_${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashout_requests', filter: `match_id=eq.${match.id}` }, () => {
        fetchWalletData();
        fetchCashoutRequests();
      })
      .subscribe();
    const ticketsChannel = supabase
      .channel(`tickets_match_${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `match_id=eq.${match.id}` }, () => fetchWalletData())
      .subscribe();
    return () => {
      supabase.removeChannel(cashoutChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [match, localTempIdentifier, fetchWalletData, fetchCashoutRequests]);

  const handleRefresh = () => Promise.all([fetchWalletData(), fetchCashoutRequests()]);

  const handleCashoutMode = () => {
    if (!localTempIdentifier) {
      toast({
        title: "Error",
        description: "Session identifier is missing. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    setCashoutDialogOpen(true);
  };

  const handleCashoutSubmit = async () => {
    if (!match || !localTempIdentifier) {
      toast({
        title: "Error",
        description: "Match or session data is missing.",
        variant: "destructive",
      });
      return;
    }

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
    if (walletBalance === 0) {
      setAmountError("No funds available for cashout");
      return;
    }
    if (!match.is_paid && !match.sell_tickets) {
      toast({
        title: "Error",
        description: "Cashout is not available for free matches with no ticket sales.",
        variant: "destructive",
      });
      return;
    }
    if (match.cancellation_status) {
      toast({
        title: "Error",
        description: "Cashout is not available for cancelled matches.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error: cashoutError } = await supabase
        .from("cashout_requests")
        .insert({
          match_id: match.id,
          super_code: match.super_code,
          amount: Number(cashoutAmount),
          account_details: {
            bank_account_number: bankAccountNumber,
            bank_name: bankName,
            account_name: accountName,
          },
          status: "Review",
          temp_identifier: localTempIdentifier,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (cashoutError) {
        if (cashoutError.code === '23503') {
          toast({
            title: "Error",
            description: "Invalid match or super code. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: cashoutError.message || "Failed to submit cashout request.",
            variant: "destructive",
          });
        }
        throw cashoutError;
      }

      await fetchCashoutRequests();
      await fetchWalletData();

      setCashoutDialogOpen(false);
      setBankAccountNumber("");
      setBankName("");
      setAccountName("");
      setCashoutAmount("");
      setBankAccountError(null);
      setAccountNameError(null);
      setAmountError(null);
      toast({
        title: "Success",
        description: "Cashout request submitted successfully. It is now under review.",
      });
    } catch (error) {
      console.error("Error submitting cashout:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-sc-green-bg text-sc-green-dark border-green-300";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "Processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-sc-soft text-sc-ink2 border-transparent";
    }
  };

  if (!match) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <BalanceHero balance={walletBalance} onRefresh={handleRefresh} onRequest={handleCashoutMode} disabled={!localTempIdentifier || !!match.cancellation_status} note="From paid slots in this match" breakdown={breakdown} />
      <CashoutList rows={cashoutRequests.map((r: any) => ({ id: r.id, amount: r.amount, created_at: r.created_at, status: r.status, name: r.account_details?.account_name, bank: r.account_details?.bank_name, account: r.account_details?.bank_account_number }))} />
      <CashoutDialog
        open={cashoutDialogOpen}
        onOpenChange={setCashoutDialogOpen}
        balance={walletBalance}
        banks={nigerianBanks}
        note="Send what you earned from paid slots in this match to your bank."
        amount={String(cashoutAmount ?? "")}
        onAmount={(v) => { setCashoutAmount(v); setAmountError(null); }}
        bank={bankName}
        onBank={(v) => setBankName(v)}
        account={bankAccountNumber}
        onAccount={(v) => { setBankAccountNumber(v.replace(/[^0-9]/g, "").slice(0, 10)); setBankAccountError(null); }}
        name={accountName}
        onName={(v) => { setAccountName(v); setAccountNameError(null); }}
        errors={{ amount: amountError, account: bankAccountError, name: accountNameError }}
        loading={loading}
        submitDisabled={!localTempIdentifier}
        onSubmit={handleCashoutSubmit}
      />
    </div>
  );
};

export default OrganizerCashout;
