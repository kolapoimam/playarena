import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { z } from "zod";

type CyclingEvent = {
  id: string;
  supercode: string; // Updated to match database schema
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price?: number;
  host_name: string;
  host_phone: string;
  start_landmark_id: string;
};

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type MatchCodeInputProps = {
  superCode: string;
  setSuperCode: (code: string) => void;
  superCodeError: string | null;
  setSuperCodeError: (error: string | null) => void;
  setMatchNotFound: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  fetchMatch: () => void;
  userId: string | null;
  recentSuperCodes: string[];
  setRecentSuperCodes: (codes: string[]) => void;
  setIsCyclingEvent: (value: boolean) => void;
  setCyclingEvent: (event: CyclingEvent | null) => void;
};

const MatchCodeInput = ({
  superCode,
  setSuperCode,
  superCodeError,
  setSuperCodeError,
  setMatchNotFound,
  loading,
  setLoading,
  fetchMatch,
  userId,
  recentSuperCodes,
  setRecentSuperCodes,
  setIsCyclingEvent,
  setCyclingEvent,
}: MatchCodeInputProps) => {
  const { toast } = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchRecentCodes = async () => {
      try {
        // Fetch recent super codes for matches and cycling events in parallel
        const [matchResponse, cyclingResponse] = await Promise.all([
          supabase
            .from("matches")
            .select("supercode") // Updated to supercode
            .eq("organizer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("cycling_events")
            .select("supercode") // Updated to supercode
            .eq("organizer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (matchResponse.error) throw matchResponse.error;
        if (cyclingResponse.error) throw cyclingResponse.error;

        const matchCodes = matchResponse.data
          .map((match) => match.supercode) // Updated to supercode
          .filter((code): code is string => !!code);
        const cyclingCodes = cyclingResponse.data
          .map((event) => event.supercode) // Updated to supercode
          .filter((code): code is string => !!code);
        const combinedCodes = [...new Set([...matchCodes, ...cyclingCodes])].slice(
          0,
          3
        );
        setRecentSuperCodes(combinedCodes);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load recent super codes.",
          variant: "destructive",
        });
      }
    };
    fetchRecentCodes();
  }, [userId, toast, setRecentSuperCodes]);

  const handleCodeChange = async (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setSuperCode(numericValue);
    setSuperCodeError(null);
    setMatchNotFound(false);
    setIsCyclingEvent(false);
    setCyclingEvent(null);

    if (numericValue.length === 6) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select("*")
          .eq("supercode", numericValue) // Updated to supercode
          .maybeSingle(); // Changed to maybeSingle to handle no rows

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setIsCyclingEvent(true);
          setCyclingEvent(data);
        } else {
          // If no cycling event is found, trigger fetchMatch to check matches table
          fetchMatch();
        }
      } catch (error: any) {
        console.error("Error checking cycling event:", error);
        toast({
          title: "Error",
          description: "Failed to validate super code.",
          variant: "destructive",
        });
        fetchMatch(); // Still try to fetch match if cycling event check fails
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Enter Super Code
      </h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          {userId && recentSuperCodes.length > 0 ? (
            <div className="relative">
              <Select
                onValueChange={(value) => {
                  setSuperCode(value);
                  setSuperCodeError(null);
                  setMatchNotFound(false);
                  setIsCyclingEvent(false);
                  setCyclingEvent(null);
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
                onChange={(e) => handleCodeChange(e.target.value)}
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
              onChange={(e) => handleCodeChange(e.target.value)}
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
            "Load Event"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchCodeInput;
