import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Loader2 } from "lucide-react";
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
  fetchMatch: () => void;
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
        const { data, error } = await supabase
          .from("matches")
          .select("super_code")
          .eq("organizer_id", userId)
          .order("created_at", { ascending: false })
          .limit(3);
        if (error) {
          toast({
            title: "Error",
            description: "Failed to load recent super codes.",
            variant: "destructive",
          });
        } else {
          setRecentSuperCodes(data.map((match) => match.super_code).filter(code => code));
        }
      };
      fetchRecentCodes();
    }
  }, [userId, toast, setRecentSuperCodes]);

  return (
    <div className="bg-white rounded-3xl p-[18px] mb-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#DCFCE7", color: "#15803D" }}><KeyRound size={20} /></span>
        <span className="flex flex-col">
          <span className="text-base font-extrabold">Match super code</span>
          <span className="text-[13px] text-sc-ink3">The 6 digit code you got when you published</span>
        </span>
      </div>
      <div className="flex flex-col gap-3">
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
                placeholder="000000"
                value={superCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  setSuperCode(value);
                  setSuperCodeError(null);
                  setMatchNotFound(false);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-full mt-2 h-14 text-center text-2xl font-extrabold tracking-[0.4em]"
                ref={codeInputRef}
              />
            </div>
          ) : (
            <Input
              placeholder="000000"
              value={superCode}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                setSuperCode(value);
                setSuperCodeError(null);
                setMatchNotFound(false);
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="w-full h-14 text-center text-2xl font-extrabold tracking-[0.4em]"
              ref={codeInputRef}
            />
          )}
          {superCodeError && (
            <p className="text-sm font-bold text-sport-red-fg mt-2 text-center">{superCodeError}</p>
          )}
        </div>
        <Button
          className="bg-sc-green hover:brightness-95 text-white font-bold rounded-full h-[52px] w-full text-base"
          onClick={fetchMatch}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Open"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchCodeInput;
