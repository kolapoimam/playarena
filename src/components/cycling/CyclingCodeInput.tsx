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
import { KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";

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

type CyclingEventResponse = {
  id_uuid: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  host_id: string;
  host_name: string;
  host_phone: string;
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
  }[];
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
    
    // Clear previous states
    setEventNotFound(false);
    setCyclingEvent(null);

    // Handle validation and error states
    if (numericValue.length === 0) {
      // Empty input - no error
      setSuperCodeError(null);
      return;
    }
    
    if (numericValue.length < 6) {
      // Incomplete code - show error
      setSuperCodeError("Code must be exactly 6 digits");
      return;
    }

    // 6-digit code entered - clear error and fetch event
    setSuperCodeError(null);
    setLoading(true);
    
    try {
      const { data: cyclingData, error: cyclingError } = await supabase
        .from("cycling_events_view")
        .select(`
          id_uuid, slug, title, event_date, start_time, max_attendees, host_id, host_name, host_phone, supercode, is_free, price, status, start_landmark_id, start_landmark, cycling_attendees
        `)
        .eq("supercode", numericValue)
        .maybeSingle();

      if (cyclingError) {
        console.error("Cycling event query error:", cyclingError);
        throw cyclingError;
      }

      if (cyclingData) {
        const response = cyclingData as unknown as CyclingEventResponse;
        const cyclingEvent: CyclingEvent = {
          ...response,
          location: response.start_landmark
            ? {
                name: response.start_landmark.name ?? "Unknown Location",
                city: response.start_landmark.state ?? "Unknown City",
              }
            : null,
          attendees: Array.isArray(response.cycling_attendees) ? response.cycling_attendees.map(attendee => ({
            ...attendee,
            details: attendee.details || { phone: attendee.attendee_phone || "N/A" },
          })) : [],
          cancellation_status: false,
          status: response.status ?? "upcoming",
        };
        setCyclingEvent(cyclingEvent);
        await fetchEvent();
        return;
      }

      // Event not found
      setEventNotFound(true);
      setSuperCodeError("No cycling event found with this super code");
      toast({
        title: "Not Found",
        description: "No cycling event found with this super code.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Error checking event:", error);
      setEventNotFound(true);
      setSuperCodeError("Failed to validate super code");
      toast({
        title: "Error",
        description: error.message || "Failed to validate super code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchEvent = async () => {
    if (superCode.length !== 6) {
      setSuperCodeError("Code must be exactly 6 digits");
      return;
    }

    setSuperCodeError(null);
    setLoading(true);
    try {
      await fetchEvent();
    } catch (error: any) {
      console.error("Error fetching event:", error);
      setEventNotFound(true);
      setSuperCodeError("Failed to fetch event");
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
    <div className="bg-white rounded-3xl p-[18px] mb-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#FFEDD5", color: "#C2410C" }}><KeyRound size={20} /></span>
        <span className="flex flex-col">
          <span className="text-base font-extrabold">Ride super code</span>
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
                  setEventNotFound(false);
                  setCyclingEvent(null);
                }}
                value={superCode}
              >
                <SelectTrigger className="w-full h-14 text-center text-2xl font-extrabold tracking-[0.4em]">
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
                onChange={(e) => handleCodeChange(e.target.value)}
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
              onChange={(e) => handleCodeChange(e.target.value)}
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
          onClick={handleFetchEvent}
          disabled={loading || superCode.length !== 6}
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

export default CyclingCodeInput;
