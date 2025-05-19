import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWalletBalance } from "@/hooks/useWalletBalance";

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

type OrganizerCashoutProps = {
  match: Match | null;
};

const OrganizerCashout = ({ match }: OrganizerCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>([]);
  const walletBalance = useWalletBalance(
    match?.id,
    match?.is_paid || false,
    match?.price,
    match?.status
  );

  useEffect(() => {
    if (!match?.id) {
      setCashoutRequests([]);
      return;
    }

    const fetchCashoutRequests = async () => {
      try {
        const { data, error }  = await supabase
          .from("cashout_requests")
          .select("*")
          .eq("match_id", match.id)
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
    };

    fetchCashoutRequests();

    // Set up real-time subscription for cashout_requests
    const channel = supabase
      .channel(`cashout_requests_match_${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cashout_requests',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          fetchCashoutRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match?.id, toast]);

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

  if (!match || cashoutRequests.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Cashout Requests</h2>
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Wallet Balance: ₦{walletBalance.toFixed(2)}
        </p>
        {walletBalance === 0 && (
          <p className="text-sm text-red-600 dark:text-red-500 mt-1">
            Wallet balance is zero. Ensure players are checked in or try refreshing.
          </p>
        )}
      </div>
      <div className="space-y-4">
        {cashoutRequests.map((request) => (
          <div
            key={request.id}
            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  ₦{request.amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(request.created_at).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Account: {request.account_details?.account_name || "Not provided"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bank: {request.account_details?.bank_name || "Not provided"} (
                  {request.account_details?.bank_account_number || "Not provided"})
                </p>
              </div>
              <span
                className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(
                  request.status
                )}`}
              >
                {request.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizerCashout;
