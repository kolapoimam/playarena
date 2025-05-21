import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
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
      setAvailableFunds(availableFunds - Number(cashoutAmount));
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

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center">
          Wallet
          <Button
            onClick={() => setCashoutDialogOpen(true)}
            disabled={availableFunds === 0 || loading}
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            Cashout ₦{availableFunds.toFixed(2)}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Available Funds: ₦{availableFunds.toFixed(2)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCashoutRequests}
            className="p-1"
            title="Refresh Cashout Requests"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {cashoutRequests.length > 0 ? `View ${cashoutRequests.length} Cashout Requests` : "No Cashout Requests"}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4">
              {cashoutRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        ₦{request.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(request.created_at).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Account: {request.account_holder_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Bank: {request.bank_name} ({request.account_number})
                      </p>
                    </div>
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <Dialog open={cashoutDialogOpen} onOpenChange={setCashoutDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request Cashout</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Enter your bank details and amount to request a cashout. Amount must not exceed available funds (₦{availableFunds.toFixed(2)}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
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
                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
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
                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
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
                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg w-full"
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
                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
              />
              {accountNameError && (
                <p className="text-sm text-red-600 mt-1">{accountNameError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCashoutDialogOpen(false)}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashoutSubmit}
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Cashout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VenueWallet;
