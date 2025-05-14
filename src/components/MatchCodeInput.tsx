import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  fetchMatch: () => void;
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
}: MatchCodeInputProps) => {
  const { toast } = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Enter Match Super Code</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Enter 6-digit super code"
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
            className="w-full text-base"
            ref={codeInputRef}
          />
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
            "Load Match"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchCodeInput;
