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
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  start_landmark_id: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    attendee_status: string;
    confirmation_code: string;
    details: { phone: string } | null;
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
  "Unity Bank", "Wema Bank", "Zenith Bank", "Current"
];

type HostCashoutProps = {
  event: CyclingEvent | null;
  tempIdentifier?: string;
};

const HostCashout = ({ event, tempIdentifier }: HostCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<Cashout[]>([]);
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

  const fetchWalletBalance = async () => {
    if (!event) {
      setWalletBalance(0);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId || userId !== event.host_id) {
        toast({
          title: "Error",
          description: "You are not authorized to view this event's balance.",
          variant: "destructive",
        });
        setWalletBalance(0);
        return;
      }

      const { data: walletData, error: walletError } = await supabase
        .from('cycling_wallets')
        .select('balance')
        .eq('host_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;

      setWalletBalance(walletData?.balance || 0);
    } catch (error: any) {
      console.error('Error fetching wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet balance.",
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
        .eq('temp_identifier', localTempIdentifier)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCashoutRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching cashout requests:', error);
      toast({
        title: "Error",
        description: "Failed to load cashout requests.",
        variant: "destructive",
      });
      setCashoutRequests([]);
    }
  };

  useEffect(() => {
    if (!event || !localTempIdentifier) return;

    fetchWalletBalance();
    fetchCashoutRequests();

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId || userId !== event.host_id) {
        throw new Error("You are not authorized to request a cashout for this event.");
      }

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
          host_id: userId,
          created_at: new Date().toISOString(),
        });

      if (cashoutError) throw cashoutError;

      const { error: walletError } = await supabase
        .rpc('update_cycling_wallet_balance', {
          p_host_id: userId,
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
        return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600';
      case 'Failed':
        return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 border-red-300 dark:border-red-600';
      case 'Processed':
        return 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600';
      case 'Review':
        return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
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
          className="bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 text-white dark:text-gray-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-gray-900 dark:text-gray-100">
          Available Balance: ₦{walletBalance.toLocaleString()}
        </p>
      </div>

      <Button
        onClick={() => walletBalance > 0 ? setCashoutDialogOpen(true) : toast({
          title: "Error",
          description: "No funds available for cashout.",
          variant: "destructive",
        })}
        className="bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white dark:text-gray-100 mb-6"
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
                  <p className="font-medium text-gray-900 dark:text-white">₦{request.total_amount_paid.toLocaleString()}</p>
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
