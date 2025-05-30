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
  supercode: string;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  total_slots: number;
  is_paid: boolean;
  price?: number;
  host_name: string;
  host_phone: string;
  start_landmark_id: string;
  location: {
    name?: string;
    city?: string;
  } | null;
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
        const [matchResponse, cyclingResponse] = await Promise.all([
          supabase
            .from("matches")
            .select("super_code")
            .eq("organizer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("cycling_events")
            .select("supercode")
            .eq("organizer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (matchResponse.error) throw matchResponse.error;
        if (cyclingResponse.error) throw cyclingResponse.error;

        const matchCodes = matchResponse.data
          .map((match) => match.super_code)
          .filter((code): code is string => !!code);
        const cyclingCodes = cyclingResponse.data
          .map((event) => event.supercode)
          .filter((code): code is string => !!code);
        const combinedCodes = [...new Set([...matchCodes, ...cyclingCodes])].slice(0, 3);
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
      const validation = codeSchema.safeParse(numericValue);
      if (!validation.success) {
        setSuperCodeError(validation.error.errors[0].message);
        return;
      }

      setLoading(true);
      try {
        // Try cycling event first
        const { data: cyclingData, error: cyclingError } = await supabase
          .from("cycling_events")
          .select(`
            id, supercode, slug, title, event_date, event_time, total_slots, is_paid, price, host_name, host_phone, start_landmark_id,
            start_landmark:landmarks(name, state)
          `)
          .eq("supercode", numericValue)
          .maybeSingle();

        if (cyclingError) {
          console.error("Cycling event query error:", cyclingError);
          throw cyclingError;
        }

        if (cyclingData) {
          const cyclingEvent: CyclingEvent = {
            ...cyclingData,
            location: cyclingData.start_landmark
              ? {
                  name: cyclingData.start_landmark.name ?? "Unknown Location",
                  city: cyclingData.start_landmark.state ?? "Unknown City",
                }
              : null,
          };
          setIsCyclingEvent(true);
          setCyclingEvent(cyclingEvent);
          setSuperCodeError(null);
          await fetchMatch();
          return;
        }

        // Try match
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("id, super_code")
          .eq("super_code", numericValue)
          .maybeSingle();

        if (matchError) {
          console.error("Match query error:", matchError);
          throw matchError;
        }

        if (matchData) {
          setIsCyclingEvent(false);
          setCyclingEvent(null);
          await fetchMatch();
          return;
        }

        // No event found
        setMatchNotFound(true);
        toast({
          title: "Not Found",
          description: "No event or match found with this super code.",
          variant: "destructive",
        });
      } catch (error: any) {
        console.error("Error checking event:", error);
        setMatchNotFound(true);
        toast({
          title: "Error",
          description: error.message || "Failed to validate super code.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFetchMatch = async () => {
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      return;
    }

    setSuperCodeError(null);
    setLoading(true);
    try {
      await fetchMatch();
    } catch (error: any) {
      console.error("Error fetching match:", error);
      setMatchNotFound(true);
      toast({
        title: "Not Found",
        description: "No event or match found with this super code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          onClick={handleFetchMatch}
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
