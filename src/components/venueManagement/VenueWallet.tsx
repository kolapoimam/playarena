import { BalanceHero, CashoutDialog, CashoutList } from "@/components/sc/CashoutUI";
import { notifyCashout } from "@/lib/notify";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { venuePayout, type Payout } from "@/lib/fees";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const bankAccountSchema = z.string().regex(/^\d{10}$/, { message: "Bank account number must be exactly 10 digits" });
const accountNameSchema = z.string().regex(/^[A-Za-z\s]+$/, { message: "Account name must contain only letters and spaces" }).min(2, { message: "Account name must be at least 2 characters" });
const amountSchema = z.number().min(1, { message: "Amount must be at least 1" }).positive({ message: "Amount must be positive" });

const nigerianBanks = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTB)", "Heritage Bank", "Keystone Bank", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "STERling Bank",
  "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
  "Unity Bank", "Wema Bank", "Zenith Bank", "SunTrust Bank Nigeria Limited",
  "Parallex Bank", "TAJ Bank", "Lotus Bank", "Opay (Paycom MFB)",
  "PalmPay (PalmPay Ltd. MFB)", "Moniepoint MFB", "Kuda Bank (Kuda MFB)",
  "Rubies Bank (Rubies MFB)", "Sparkle MFB", "VFD MFB", "FairMoney MFB",
  "Carbon (One Finance MFB)", "Mint MFB", "Eyowo MFB", "GoMoney (Go Financial Services)",
  "ALAT by Wema", "Branch MFB", "9Pay MFB", "MKOBO MFB", "PayDay (Africhange Technologies)",
  "Chipper Cash (Chipper Technologies)", "Paga", "NowNow MFB"
];

type VenueWalletProps = {
  venueId: string;
  availableFunds: number;
  setAvailableFunds: (amount: number) => void;
};

type CashoutRequest = {
  id: string;
  venue_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  status: "Review" | "Processed" | "Successful" | "Failed";
  created_at: string;
};

const VenueWallet = ({ venueId, availableFunds, setAvailableFunds }: VenueWalletProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>([]);
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCashoutRequests = useCallback(async () => {
    if (!venueId) {
      setCashoutRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("venue_booking_cashout")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCashoutRequests(data || []);
    } catch (error) {
      console.error("Error fetching cashout requests:", error);
      toast({
        title: "Error",
        description: "Failed to load cashout requests.",
        variant: "destructive",
      });
      setCashoutRequests([]);
    }
  }, [venueId, toast]);

  // What is left to cash out after the referral fee and earlier cashouts
  const [breakdown, setBreakdown] = useState<Payout | null>(null);
  const refreshFunds = useCallback(async () => {
    if (!venueId) return;
    const p = await venuePayout(venueId);
    if (!p) {
      toast({ title: "Balance not updated", description: "Please try again.", variant: "destructive" });
      return;
    }
    setBreakdown(p);
    setAvailableFunds(p.available);
  }, [venueId, setAvailableFunds, toast]);

  useEffect(() => { refreshFunds(); }, [refreshFunds]);

  useEffect(() => {
    fetchCashoutRequests();

    const channel = supabase
      .channel(`venue_cashout_${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_booking_cashout',
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchCashoutRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchCashoutRequests]);

  const handleCashoutSubmit = async () => {
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
    if (Number(cashoutAmount) > availableFunds) {
      setAmountError("Amount exceeds available funds");
      return;
    }
    if (availableFunds === 0) {
      setAmountError("No funds available for cashout");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("venue_booking_cashout")
        .insert({
          venue_id: venueId,
          amount: Number(cashoutAmount),
          bank_name: bankName,
          account_number: bankAccountNumber,
          account_holder_name: accountName,
          status: "Review",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (!error) notifyCashout("venue_booking_cashout", { venue_id: venueId });

      if (error) {
        console.error("Cashout error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to submit cashout request.",
          variant: "destructive",
        });
        throw error;
      }

      await fetchCashoutRequests();
      await refreshFunds();
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

  return (
    <div className="flex flex-col gap-3.5">
      <BalanceHero accent="#7C3AED" label="Venue wallet" balance={availableFunds} onRefresh={() => Promise.all([refreshFunds(), fetchCashoutRequests()])} onRequest={() => setCashoutDialogOpen(true)} disabled={loading} note="From bookings at your venue" breakdown={breakdown} />
      <CashoutList rows={cashoutRequests.map((r: any) => ({ id: r.id, amount: r.amount, created_at: r.created_at, status: r.status, name: r.account_holder_name, bank: r.bank_name, account: r.account_number }))} />
      <CashoutDialog
        open={cashoutDialogOpen}
        onOpenChange={setCashoutDialogOpen}
        balance={availableFunds}
        accent="#7C3AED"
        banks={nigerianBanks}
        note="Cash out what your venue earned from bookings."
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
        onSubmit={handleCashoutSubmit}
      />
    </div>
  );
};

export default VenueWallet;
