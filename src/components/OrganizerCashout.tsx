import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Match = {
  id: string;
  super_code: string;
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
  status: "review" | "processed" | "successful" | "failed";
  temp_identifier?: string;
  created_at: string;
};

type OrganizerCashoutProps = {
  match: Match | null;
};

const OrganizerCashout = ({ match }: OrganizerCashoutProps) => {
  const { toast } = useToast();
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>([]);

  useEffect(() => {
    if (!match?.id) {
      setCashoutRequests([]);
      return;
    }

    const fetchCashoutRequests = async () => {
      try {
        const { data, error } = await supabase
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
  }, [match?.id, toast]);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "successful":
        return "bg-green-100 text-green-700 border-green-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "review":
      case "under_review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  if (!match || cashoutRequests.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Cashout Requests</h2>
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
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizerCashout;
