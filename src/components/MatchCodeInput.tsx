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
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type MatchCodeInputProps = {
  superCode: string;
  setSuperCode: (code: string) => void;
  superCodeError: string | null;
  setSuperCodeError: (error: string | null) => void;
  setMatchNotFound: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  fetchMatch: () => Promise<void>;
  userId: string | null;
  recentSuperCodes: string[];
  setRecentSuperCodes: (codes: string[]) => void;
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
}: MatchCodeInputProps) => {
  const { toast } = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) {
      const fetchRecentCodes = async () => {
        try {
          const { data: matchData, error: matchError } = await supabase
            .from("matches")
            .select("super_code")
            .eq("organizer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3);

          if (matchError) throw matchError;

          const matchCodes = matchData
            .map((match) => match.super_code)
            .filter((code): code is string => !!code)
            .slice(0, 3);
          setRecentSuperCodes(matchCodes);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load recent super codes.",
            variant: "destructive",
          });
        }
      };
      fetchRecentCodes();
    }
  }, [userId, toast, setRecentSuperCodes]);

  const handleCodeChange = async (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setSuperCode(numericValue);
    setSuperCodeError(null);
    setMatchNotFound(false);

    if (numericValue.length === 6) {
      setLoading(true);
      try {
        const result = codeSchema.safeParse(numericValue);
        if (!result.success) {
          setSuperCodeError(result.error.errors[0].message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Example fetchMatch implementation
  const handleFetchMatch = async () => {
    if (!superCode) {
      setSuperCodeError("Please enter a super code");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("id, slug, title, venue_id, match_date, match_time, total_slots, status, organizer_id")
        .eq("super_code", superCode)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setMatchNotFound(true);
          setSuperCodeError("No match found with this super code");
        } else {
          throw error;
        }
      }

      if (data) {
        // Assuming parent component handles match data via context or state
        toast({
          title: "Success",
          description: `Match "${data.title}" loaded successfully`,
        });
        // You may want to pass `data` to a parent component or context
        // For now, we assume fetchMatch updates state elsewhere
        await fetchMatch();
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match. Please try again.",
        variant: "destructive",
      });
      setMatchNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Enter Super Code</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          {userId && recentSuperCodes.length > 0 ? (
            <div className="relative">
              <Select
                onValueChange={(value) => {
                  setSuperCode(value);
                  setSuperCodeError(null);
                  setMatchNotFound(false);
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
            "Load Match"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchCodeInput;
