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
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price?: number;
  host_name: string;
  host_phone: string;
  start_landmark_id: string;
  cancellation_status: string | null;
  status: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  cycling_attendees: {
    id: string;
    attendee_name: string;
    attendee_phone: string;
    attendee_status: "registered" | "checked_in" | "absent";
    confirmation_code: number;
    payment_status: boolean;
    number_of_slots?: string;
  }[] | null;
};

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type CyclingCodeInputProps = {
  superCode: string;
  setSuperCode: (code: string) => void;
  superCodeError: string | null;
  setSuperCodeError: (error: string | null) => void;
  setEventNotFound: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  fetchEvent: () => Promise<void>;
  userId: string | null;
  recentSuperCodes: string[];
  setRecentSuperCodes: (codes: string[]) => void;
  setCyclingEvent: (event: CyclingEvent | null) => void;
};

const CyclingCodeInput = ({
  superCode,
  setSuperCode,
  superCodeError,
  setSuperCodeError,
  setEventNotFound,
  loading,
  setLoading,
  fetchEvent,
  userId,
  recentSuperCodes,
  setRecentSuperCodes,
  setCyclingEvent,
}: CyclingCodeInputProps) => {
  const { toast } = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchRecentCodes = async () => {
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select("supercode")
          .eq("host_id", userId)
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;

        const cyclingCodes = data
          .map((event) => event.supercode)
          .filter((code): code is string => !!code);
        setRecentSuperCodes([...new Set(cyclingCodes)].slice(0, 3));
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
    setEventNotFound(false);
    setCyclingEvent(null);

    if (numericValue.length === 6) {
      const validation = codeSchema.safeParse(numericValue);
      if (!validation.success) {
        setSuperCodeError(validation.error.errors[0].message);
        return;
      }

      setLoading(true);
      try {
const { data: cyclingData, error: cyclingError } = await supabase
.from("cycling_events_view")
.select(`
  id, supercode, slug, title, event_date, start_time, max_attendees, is_free, price, host_name, host_phone, start_landmark_id, status, start_landmark, attendees),
  cycling_attendees(id_uuid, attendee_name, attendee_phone, attendee_status, confirmation_code, payment_status, number_of_slots)
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
            cycling_attendees: cyclingData.cycling_attendees || [],
          };
          setCyclingEvent(cyclingEvent);
          setSuperCodeError(null);
          await fetchEvent();
          return;
        }

        setEventNotFound(true);
        toast({
          title: "Not Found",
          description: "No cycling event found with this super code.",
          variant: "destructive",
        });
      } catch (error: any) {
        console.error("Error checking event:", error);
        setEventNotFound(true);
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

  const handleFetchEvent = async () => {
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      return; 
    }

    setSuperCodeError(null);
    setLoading(true);
    try {
      await fetchEvent();
    } catch (error: any) {
      console.error("Error fetching event:", error);
      setEventNotFound(true);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch event.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Enter Cycling Event Super Code
      </h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          {userId && recentSuperCodes.length > 0 ? (
            <div className="relative">
              <Select
                onValueChange={(value) => {
                  setSuperCode(value);
                  setSuperCodeError(null);
                  setEventNotFound(false);
                  setCyclingEvent(null);
                }}
                value={superCode}
              >
                <SelectTrigger className="w-full text-base dark:bg-gray-700 dark:text-gray-100">
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
                className="w-full text-base mt-2 dark:bg-gray-700 dark:text-gray-100"
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
              className="w-full text-base dark:bg-gray-700 dark:text-gray-100"
              ref={codeInputRef}
            />
          )}
          {superCodeError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{superCodeError}</p>
          )}
        </div>
        <Button
          className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
          onClick={handleFetchEvent}
          disabled={loading || superCode.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Load Cycling Event"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CyclingCodeInput;
