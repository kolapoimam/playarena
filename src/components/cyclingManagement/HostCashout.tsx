import { BalanceHero, CashoutDialog, CashoutList } from "@/components/sc/CashoutUI";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

type CyclingEvent = {
  id_uuid: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string | null;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  cycling_attendees: {
    id?: string;
    id_uuid?: string;
    attendee_name: string;
    attendee_phone?: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  cycling_event_id_uuid: string;
  supercode: string;
  total_amount_paid: number;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: 'Review' | 'Processed' | 'Failed' | 'Successful';
  temp_identifier?: string;
  host_id: string;
  created_at: string;
  updated_at: string;
};

const bankAccountSchema = z.string().regex(/^\d{10}$/, { message: "Bank account number must be exactly 10 digits" });
const accountNameSchema = z.string().min(2, { message: "Account name must be at least 2 characters" });
const amountSchema = z.number().positive({ message: "Amount must be positive" });
const bankNameSchema = z.string().min(1, { message: "Please select a bank" });

const nigerianBanks = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTB)", "Heritage Bank", "Keystone Bank", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank",
  "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
  "Unity Bank", "Wema Bank", "Zenith Bank", "Current"
];

type HostCashoutProps = {
  event: CyclingEvent | null;
  tempIdentifier?: string;
};

interface FormErrors {
  cashoutAmount?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  accountName?: string | null;
}

const HostCashout = ({ event, tempIdentifier }: HostCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<Cashout[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [localTempIdentifier, setLocalTempIdentifier] = useState(tempIdentifier);

  useEffect(() => {
    if (!tempIdentifier) {
      const stored = localStorage.getItem('tempIdentifier');
      if (stored) {
        setLocalTempIdentifier(stored);
      } else {
        const newId = uuidv4();
        localStorage.setItem('tempIdentifier', newId);
        setLocalTempIdentifier(newId);
      }
    }
  }, [tempIdentifier]);

  const fetchWalletBalance = async () => {
    if (!event) {
      setWalletBalance(0);
      return;
    }

    try {
      // Prioritize cycling_wallets.balance
      const { data: walletData, error: walletError } = await supabase
        .from('cycling_wallets')
        .select('balance')
        .eq('host_id', event.host_id)
        .maybeSingle();

      if (walletError) {
        console.error("Wallet fetch error:", walletError);
        throw walletError;
      }

      if (walletData?.balance !== undefined) {
        setWalletBalance(walletData.balance);
        return;
      }

      // Fallback to attendee-based calculation
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('cycling_attendees')
        .select('status, number_of_slots')
        .eq('cycling_event_id_uuid', event.id_uuid);

      if (attendeesError) {
        console.error("Attendees fetch error:", attendeesError);
        throw attendeesError;
      }

      let calculatedBalance = 0;
      if (!event.is_free && event.price) {
        const checkedInAttendees = attendeesData?.filter((a) => a.status === "checked_in") || [];
        calculatedBalance = checkedInAttendees.reduce(
          (sum, attendee) => sum + ((Number(attendee.number_of_slots) || 1) * (event.price || 0)),
          0
        );
      }

      setWalletBalance(calculatedBalance);
    } catch (error: any) {
      console.error('Error fetching wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet balance. Please try again.",
        variant: "destructive",
      });
      setWalletBalance(0);
    }
  };

  const fetchCashoutRequests = async () => {
    if (!event || !localTempIdentifier) {
      setCashoutRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cycling_cashouts')
        .select('*')
        .eq('cycling_event_id_uuid', event.id_uuid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Cashout fetch error:", error);
        throw error;
      }

      setCashoutRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching cashout requests:', error);
      toast({
        title: "Error",
        description: "Failed to load cashout requests. Please try again.",
        variant: "destructive",
      });
      setCashoutRequests([]);
    }
  };

  useEffect(() => {
    if (!event || !localTempIdentifier) return;

    fetchWalletBalance();
    fetchCashoutRequests();

    const cashoutChannel = supabase
      .channel(`cycling_cashouts_event_${event.id_uuid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cycling_cashouts',
          filter: `cycling_event_id_uuid=eq.${event.id_uuid}`,
        },
        () => {
          fetchWalletBalance();
          fetchCashoutRequests();
        }
      )
      .subscribe();

    // Add cycling_wallets subscription
    const walletChannel = supabase
      .channel(`cycling_wallets_${event.host_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cycling_wallets',
          filter: `host_id=eq.${event.host_id}`,
        },
        () => {
          fetchWalletBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cashoutChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [event, localTempIdentifier]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'bankAccountNumber') {
      setBankAccountNumber(value.replace(/[^0-9]/g, '').slice(0, 10));
      const validation = bankAccountSchema.safeParse(value);
      setErrors(prev => ({ ...prev, bankAccountNumber: validation.success ? null : validation.error.errors[0].message }));
    } else if (field === 'accountName') {
      setAccountName(value);
      const validation = accountNameSchema.safeParse(value);
      setErrors(prev => ({ ...prev, accountName: validation.success ? null : validation.error.errors[0].message }));
    } else if (field === 'cashoutAmount') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setCashoutAmount(numericValue);
      const validation = amountSchema.safeParse(Number(numericValue));
      setErrors(prev => ({
        ...prev,
        cashoutAmount: validation.success ? null : validation.error.errors[0].message,
      }));
    } else if (field === 'bankName') {
      setBankName(value);
      const validation = bankNameSchema.safeParse(value);
      setErrors(prev => ({ ...prev, bankName: validation.success ? null : validation.error.errors[0].message }));
    }
  };

  const handleCashoutSubmit = async () => {
    if (!event || !localTempIdentifier) {
      toast({
        title: "Error",
        description: "Event or session data is missing.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(cashoutAmount);
    const validations = {
      bankAccountNumber: bankAccountSchema.safeParse(bankAccountNumber),
      accountName: accountNameSchema.safeParse(accountName),
      cashoutAmount: amountSchema.safeParse(amount),
      bankName: bankNameSchema.safeParse(bankName),
    };

    const newErrors: FormErrors = {};
    let hasError = false;

    for (const [field, result] of Object.entries(validations)) {
      if (!result.success) {
        newErrors[field as keyof FormErrors] = result.error.errors[0].message;
        hasError = true;
      } else {
        newErrors[field as keyof FormErrors] = null;
      }
    }

    setErrors(newErrors);

    if (hasError) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    if (amount > walletBalance) {
      setErrors(prev => ({ ...prev, cashoutAmount: 'Amount exceeds available balance' }));
      toast({
        title: "Error",
        description: "Cashout amount exceeds available balance.",
        variant: "destructive",
      });
      return;
    }

    if (walletBalance === 0) {
      setErrors(prev => ({ ...prev, cashoutAmount: 'No funds available for cashout' }));
      toast({
        title: "Error",
        description: "No funds available for cashout.",
        variant: "destructive",
      });
      return;
    }

    if (event.is_free) {
      toast({
        title: "Error",
        description: "Cashout is not available for free events.",
        variant: "destructive",
      });
      return;
    }

    if (event.cancellation_status) {
      toast({
        title: "Error",
        description: "Cashout is not available for cancelled events.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: cashoutError } = await supabase
        .from('cycling_cashouts')
        .insert({
          cycling_event_id_uuid: event.id_uuid,
          supercode: event.supercode,
          total_amount_paid: amount,
          bank_account_number: bankAccountNumber,
          bank_name: bankName,
          account_name: accountName,
          status: 'Review',
          temp_identifier: localTempIdentifier,
          host_id: event.host_id,
          created_at: new Date().toISOString(),
        });

      if (cashoutError) {
        console.error("Cashout insert error:", cashoutError);
        if (cashoutError.code === '23503') {
          toast({
            title: "Error",
            description: "Invalid event or host data. Please contact support.",
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

      // Optimistic UI update
      setWalletBalance(prev => prev - amount < 0 ? 0 : prev - amount);

      await fetchCashoutRequests();
      setCashoutDialogOpen(false);
      setBankAccountNumber('');
      setBankName('');
      setAccountName('');
      setCashoutAmount('');
      setErrors({});

      toast({
        title: "Success",
        description: "Cashout request submitted successfully.",
      });
    } catch (error: any) {
      console.error('Cashout error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit cashout request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Successful':
        return 'bg-sc-green-bg dark:bg-green-800 text-sc-green-dark dark:text-green-200 border-green-300 dark:border-green-600';
      case 'Failed':
        return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 border-red-300 dark:border-red-600';
      case 'Processed':
        return 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600';
      case 'Review':
        return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600';
      default:
        return 'bg-sc-soft dark:bg-gray-700 text-sc-ink2 dark:text-gray-200 border-sc-line dark:border-gray-600';
    }
  };

  if (!event) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <BalanceHero accent="#F97316" balance={walletBalance} onRefresh={() => Promise.all([fetchWalletBalance(), fetchCashoutRequests()])} onRequest={() => setCashoutDialogOpen(true)} disabled={event.cancellation_status || loading || walletBalance <= 0} note="From paid spots on this ride" />
      <CashoutList rows={cashoutRequests.map((r: any) => ({ id: r.id, amount: r.total_amount_paid, created_at: r.created_at, status: r.status, name: r.account_name, bank: r.bank_name, account: r.bank_account_number }))} />
      <CashoutDialog
        open={cashoutDialogOpen}
        onOpenChange={setCashoutDialogOpen}
        balance={walletBalance}
        accent="#F97316"
        banks={nigerianBanks}
        note="Send what you earned from paid spots on this ride to your bank."
        amount={String(cashoutAmount ?? "")}
        onAmount={(v) => handleInputChange('cashoutAmount', v)}
        bank={bankName}
        onBank={(v) => handleInputChange('bankName', v)}
        account={String(bankAccountNumber ?? "")}
        onAccount={(v) => handleInputChange('bankAccountNumber', v.replace(/[^0-9]/g, "").slice(0, 10))}
        name={accountName}
        onName={(v) => handleInputChange('accountName', v)}
        errors={{
          amount: typeof errors.cashoutAmount === "string" ? errors.cashoutAmount : null,
          bank: typeof errors.bankName === "string" ? errors.bankName : null,
          account: typeof errors.bankAccountNumber === "string" ? errors.bankAccountNumber : null,
          name: typeof errors.accountName === "string" ? errors.accountName : null,
        }}
        loading={loading}
        onSubmit={handleCashoutSubmit}
      />
    </div>
  );
};

export default HostCashout;
