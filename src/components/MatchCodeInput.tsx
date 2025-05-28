import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message "Code must be exactly 6 digits" });

type MatchCodeInputProps = {
  superCode string;
  setSuperCode (code string) => void;
  superCodeError string | null;
  setSuperCodeError (error string | null) => void;
  setMatchNotFound (value boolean) => void;
  loading boolean;
  setLoading (value boolean) => void;
  fetchMatch () => void;
  userId string | null;
  recentSuperCodes string[];
  setRecentSuperCodes (codes string[]) => void;
  setIsCyclingEvent (value boolean) => void; // New prop to indicate cycling event
  setCyclingEvent (event any) => void; // New prop to store cycling event data
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
} MatchCodeInputProps) => {
  const { toast } = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) {
      const fetchRecentCodes = async () => {
        try {
          // Fetch recent match super codes
          const { data matchData, error matchError } = await supabase
            .from("matches")
            .select("super_code")
            .eq("organizer_id", userId)
            .order("created_at", { ascending false })
            .limit(3);

          if (matchError) throw matchError;

          // Fetch recent cycling event super codes
          const { data cyclingData, error cyclingError } = await supabase
            .from("cycling_events")
            .select("super_code")
            .eq("organizer_id", userId)
            .order("created_at", { ascending false })
            .limit(3);

          if (cyclingError) throw cyclingError;

          // Combine and deduplicate super codes
          const matchCodes = matchData.map((match) => match.super_code).filter(code => code);
          const cyclingCodes = cyclingData.map((event) => event.super_code).filter(code => code);
          const combinedCodes = [...new Set([...matchCodes, ...cyclingCodes])].slice(0, 3);
          setRecentSuperCodes(combinedCodes);
        } catch (error) {
          toast({
            title "Error",
            description "Failed to load recent super codes.",
            variant "destructive",
          });
        }
      };
      fetchRecentCodes();
    }
  }, [userId, toast, setRecentSuperCodes]);

  const handleCodeChange = async (value string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setSuperCode(numericValue);
    setSuperCodeError(null);
    setMatchNotFound(false);
    setIsCyclingEvent(false);
    setCyclingEvent(null);

    // Check if the code corresponds to a cycling event
    if (numericValue.length === 6) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select("*")
          .eq("super_code", numericValue)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setIsCyclingEvent(true);
          setCyclingEvent(data);
        }
      } catch (error) {
        console.error("Error checking cycling event", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white darkbg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 darkborder-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 darktext-gray-100">Enter Super Code</h2>
      <div className="flex flex-col smflex-row gap-4">
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
          ) (
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
          className="bg-green-500 hoverbg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full smw-auto"
          onClick={fetchMatch}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Loading...
            </>
          ) (
            "Load Event"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchCodeInput;
