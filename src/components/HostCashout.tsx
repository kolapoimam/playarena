import { useState, useEffect, useCallback } from 'react';
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
  id: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
  attendees: {
    id: string;
    attendee_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type CashoutRequest = {
  id: string;
  event_id: string;
  super_code: string;
  amount: number;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: 'Review' | 'Processed' | 'Successful' | 'Failed';
  temp_identifier?: string;
  created_at: string;
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
  "Unity Bank", "Wema Bank", "Zenith Bank", "SunTrust Bank Nigeria Limited",
  "Parallex Bank", "TAJ Bank", "Lotus Bank", "Opay (Paycom MFB)",
  "PalmPay (PalmPay Ltd. MFB)", "Moniepoint MFB", "Kuda Bank (Kuda MFB)",
  "Rubies Bank (Rubies MFB)", "Sparkle MFB", "VFD MFB", "FairMoney MFB",
  "Carbon (One Finance MFB)", "Mint MFB", "Eyowo MFB", "GoMoney (Go Financial Services)",
  "ALAT by Wema", "Branch MFB", "9Pay MFB", "MKOBO MFB", "PayDay (Africhange Technologies)",
  "Chipper Cash (Chipper Technologies)", "Paga", "NowNow MFB"
];

type HostCashoutProps = {
  event: CyclingEvent | null;
  tempIdentifier: string;
};

const HostCashout = ({ event, tempIdentifier }: HostCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
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

  const fetchWalletBalance = useCallback(async () => {
    if (!event) {
      setWalletBalance(0);
      return;
    }

    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('status, number_of_slots')
        .eq('event_id', event.id);

      if (attendeesError) throw attendeesError;

      let balance = 0;
      if (event.is_paid && event.price) {
        const checkedInAttendees = attendeesData.filter(a => a.status === 'checked_in');
        balance = checkedInAttendees.reduce(
          (sum, attendee) => sum + ((attendee.number_of_slots || 1) * (event.price || 0)),
          0
        );
      }

      const { data: cashoutData, error: cashoutError } = await supabase
        .from('cashouts')
        .select('amount')
        .eq('event_id', event.id)
        .in('status', ['Review', 'Processed', 'Successful']);

      if (cashoutError) throw cashoutError;

      const cashoutTotal = cashoutData.reduce((sum, request) => sum + (request.amount || 0), 0);
      balance -= cashoutTotal;

      setWalletBalance(balance < 0 ? 0 : balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet balance.",
        variant: "destructive",
      });
      setWalletBalance(0);
    }
  }, [event, toast]);

  const fetchCashoutRequests = useCallback(async () => {
    if (!event) {
      setCashoutRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cashouts')
        .select('*')
        .eq('event_id', event.id)
        .eq('temp_identifier', localTempIdentifier)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCashoutRequests(data || []);
    } catch (error) {
      console.error('Error fetching cashout requests:', error);
      toast({
        title: "Error",
        description: "Failed to load cashout requests.",
        variant: "destructive",
      });
      setCashoutRequests([]);
    }
  }, [event, localTempIdentifier, toast]);

  useEffect(() => {
    if (!event || !localTempIdentifier) return;

    fetchWalletBalance();
    fetchCashoutRequests();

    const channel = supabase
      .channel(`cashouts_event_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cashouts',
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          fetchWalletBalance();
          fetchCashoutRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, localTempIdentifier, fetchWalletBalance, fetchCashoutRequests]);

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

    const newErrors: { [key: string]: string | null } = {};
    let hasError = false;

    for (const [field, result] of Object.entries(validations)) {
      if (!result.success) {
        newErrors[field] = result.error.errors[0].message;
        hasError = true;
      } else {
        newErrors[field] = null;
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
      setErrors(prev => ({ ...prev, cashoutAmount: "Amount exceeds available balance" }));
      toast({
        title: "Error",
        description: "Cashout amount exceeds available balance.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        throw new Error("User not authenticated.");
      }

      const { error: cashoutError } = await supabase
        .from('cashouts')
        .insert({
          event_id: event.id,
          super_code: event.super_code,
          amount,
          bank_account_number: bankAccountNumber,
          bank_name: bankName,
          account_name: accountName,
          status: 'Review',
          temp_identifier: localTempIdentifier,
          organizer_id: userId,
          created_at: new Date().toISOString(),
        });

      if (cashoutError) throw cashoutError;

      const { error: walletError } = await supabase.rpc('update_wallet_balance', {
        p_organizer_id: userId,
        p_amount: amount,
        p_operation: 'subtract',
      });

      if (walletError) {
        console.error('Wallet update error:', walletError);
        toast({
          title: "Warning",
          description: "Cashout requested, but failed to update wallet balance.",
          variant: "destructive",
        });
      }

      await fetchCashoutRequests();
      await fetchWalletBalance();

      setCashoutDialogOpen(false);
      setBankAccountNumber('');
      setBankName('');
      setAccountName('');
      setCashoutAmount('');

      toast({
        title: "Success",
        description: "Cashout request submitted successfully.",
      });
    } catch (error: any) {
      console.error('Cashout error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit cashout request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Successful':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Failed':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'Processed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Review':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cashout</h2>
        <Button
          onClick={() => {
            fetchWalletBalance();
            fetchCashoutRequests();
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-gray-900 dark:text-white">
          Available Balance: ₦{walletBalance.toLocaleString()}
        </p>
      </div>

      <Button
        onClick={() => walletBalance > 0 ? setCashoutDialogOpen(true) : toast({
          title: "Error",
          description: "No funds available for cashout.",
          variant: "destructive",
        })}
        className="bg-green-500 hover:bg-green-600 text-white mb-6"
        disabled={event.cancellation_status || loading || walletBalance <= 0}
      >
        Request Cashout
      </Button>

      <h3 className="text-md font-semibold mb-4 text-gray-900 dark:text-white">Cashout History</h3>
      {cashoutRequests.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No cashout requests found.</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {cashoutRequests.map(request => (
            <div key={request.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">₦{request.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{request.account_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{request.bank_name} - {request.bank_account_number}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(request.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(request.status)}`}>
                  {request.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={cashoutDialogOpen} onOpenChange={setCashoutDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Request Cashout</DialogTitle>
            <DialogDescription>Enter your bank details to request a cashout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₦)</label>
              <Input
                type="number"
                value={cashoutAmount}
                onChange={(e) => handleInputChange('cashoutAmount', e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
              {errors.cashoutAmount && <p className="text-sm text-red-600 mt-1">{errors.cashoutAmount}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank</label>
              <Select onValueChange={(value) => handleInputChange('bankName', value)} value={bankName}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianBanks.map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankName && <p className="text-sm text-red-600 mt-1">{errors.bankName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                placeholder="Enter 10-digit account number"
                inputMode="numeric"
                maxLength={10}
                className="mt-1"
              />
              {errors.bankAccountNumber && <p className="text-sm text-red-600 mt-1">{errors.bankAccountNumber}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</label>
              <Input
                value={accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="Enter account name"
                className="mt-1"
              />
              {errors.accountName && <p className="text-sm text-red-600 mt-1">{errors.accountName}</p>}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setCashoutDialogOpen(false)}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashoutSubmit}
              className="bg-green-500 hover:bg-green-600 text-white rounded-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostCashout;
