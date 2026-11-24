import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Bike, Check, CheckCircle2, Clock, Loader2, QrCode, ScanLine, Users } from "lucide-react";
import { Avatar, EmptyState, Pill, ScButton, Segmented, StatCard, initialsOf, type Sport } from "@/components/sc/ui";
import { z } from "zod";
import { isPast, addHours, addDays } from "date-fns";

import QrScannerDialog, { QrScanButton } from "@/components/sc/QrScanner";
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
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
    is_own_bike?: boolean;
    is_rental_bike?: boolean;
  }[] | null;
};

type AttendeeStatus = {
  id_uuid: string;
  status: "registered" | "checked_in" | "absent";
  checkinCode: string;
};

type CheckinCodes = { [key: string]: string };
type CheckinCodeErrors = { [key: string]: string | null };

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

type AttendeesManagementProps = {
  event: CyclingEvent | null;
  tempIdentifier: string;
  attendeeStatuses: AttendeeStatus[];
  setAttendeeStatuses: (statuses: AttendeeStatus[]) => void;
  checkinCodes: { [key: string]: string };
  setCheckinCodes: (codes: { [key: string]: string }) => void;
  checkinCodeErrors: { [key: string]: string | null };
  setCheckinCodeErrors: (errors: { [key: string]: string | null }) => void;
  fetchEvent: () => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isEventPast: boolean;
  canConfirmAttendees: boolean;
  navigate: (path: string) => void;
};

const AttendeesManagement = ({
  event,
  tempIdentifier,
  attendeeStatuses,
  setAttendeeStatuses,
  checkinCodes,
  setCheckinCodes,
  checkinCodeErrors,
  setCheckinCodeErrors,
  fetchEvent,
  loading,
  setLoading,
  isEventPast,
  canConfirmAttendees,
  navigate,
}: AttendeesManagementProps) => {
  const { toast } = useToast();
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinAttendee, setCheckinAttendee] = useState<{
    id: string;
    name: string;
    slots: number;
  } | null>(null);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const [checkingInAttendees, setCheckingInAttendees] = useState<{
    [key: string]: boolean;
  }>({});
  const [localTempIdentifier, setLocalTempIdentifier] = useState(tempIdentifier);
  const [mode, setMode] = useState<"checkin" | null>(null);

  useEffect(() => {
    if (!tempIdentifier) {
      const stored = localStorage.getItem('tempIdentifier');
      if (stored) {
        setLocalTempIdentifier(stored);
      } else {
        const newId = require('uuid').v4();
        localStorage.setItem('tempIdentifier', newId);
        setLocalTempIdentifier(newId);
      }
    }
    if (event?.supercode) {
      localStorage.setItem('eventSupercode', event.supercode);
    }
  }, [tempIdentifier, event]);

  useEffect(() => {
    if (!event?.id_uuid) return;

    const fetchAttendeeStatuses = async () => {
      try {
        const { data: attendeesData, error } = await supabase
          .from('cycling_attendees')
          .select('id_uuid, status, is_own_bike, is_rental_bike')
          .eq('cycling_event_id_uuid', event.id_uuid);

        if (error) throw error;

        const initialStatuses = attendeesData.map(attendee => ({
          id_uuid: attendee.id_uuid,
          status: attendee.status,
          checkinCode: checkinCodes[attendee.id_uuid] || ''
        }));
        setAttendeeStatuses(initialStatuses);

        // Check if event is past 24 hours and update statuses to absent
        const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
        const twentyFourHoursAfter = addHours(eventDateTime, 24);
        if (isPast(twentyFourHoursAfter) && attendeesData.length > 0) {
          const registeredAttendees = attendeesData.filter(a => a.status === 'registered');
          if (registeredAttendees.length > 0) {
            try {
              const { error: updateError } = await supabase
                .from('cycling_attendees')
                .update({ 
                  status: 'absent',
                  updated_at: new Date().toISOString()
                })
                .eq('cycling_event_id_uuid', event.id_uuid)
                .eq('status', 'registered');

              if (updateError) throw updateError;

              setAttendeeStatuses(prev =>
                prev.map(status =>
                  registeredAttendees.some(a => a.id_uuid === status.id_uuid)
                    ? { ...status, status: 'absent' }
                    : status
                )
              );

              await fetchEvent();
            } catch (error) {
              console.error("Error updating attendees to absent:", error);
              toast({
                title: "Error",
                description: "Failed to update attendee statuses to absent.",
                variant: "destructive",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching attendee statuses:", error);
        toast({
          title: "Error",
          description: "Failed to load attendee statuses.",
          variant: "destructive",
        });
        if (event?.cycling_attendees) {
          const initialStatuses = event.cycling_attendees.map(attendee => ({
            id_uuid: attendee.id_uuid,
            status: attendee.status,
            checkinCode: checkinCodes[attendee.id_uuid] || ''
          }));
          setAttendeeStatuses(initialStatuses);
        }
      }
    };

    fetchAttendeeStatuses();

    const channel = supabase
      .channel(`attendees_event_${event.id_uuid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cycling_attendees',
          filter: `cycling_event_id_uuid=eq.${event.id_uuid}`,
        },
        (payload) => {
          console.log('Received real-time update:', payload);
          fetchAttendeeStatuses();
          fetchEvent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, setAttendeeStatuses, checkinCodes, fetchEvent, toast]);

  const canCheckin = () => {
    if (!event || event.cancellation_status || !event.cycling_attendees?.length) return false;
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const checkTime = addHours(eventDateTime, 24);
    const hasRegisteredAttendees = event.cycling_attendees?.some(a => a.status === "registered");
    return !isPast(checkTime) && hasRegisteredAttendees;
  };

  const handleCheckinMode = () => {
    if (!event || event.cancellation_status) {
      toast({
        title: "Check-in Not Available",
        description: "Event data is unavailable or the event is canceled.",
        variant: "destructive",
      });
      return;
    }

    if (!canCheckin()) {
      const reason = !event.cycling_attendees?.length
        ? "No attendees are registered for this event."
        : "The event has ended or check-in is no longer available.";
      toast({
        title: "Check-in Not Available",
        description: reason,
        variant: "destructive",
      });
      return;
    }

    setMode("checkin");
    setIsAttendeesOpen(true);
  };

  const [scanOpen, setScanOpen] = useState(false);
  const handleScannedCode = async (code: string) => {
    const attendee = event?.cycling_attendees?.find((a) => a.confirmation_code === code);
    if (!attendee) {
      toast({ title: "Code not found", description: "No rider in this event has that code.", variant: "destructive" });
      return;
    }
    await handleCheckin(attendee.id_uuid, code);
  };

  const handleCheckinCodeChange = (attendeeId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev) => ({ ...prev, [attendeeId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev) => ({
      ...prev,
      [attendeeId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const handleCheckin = async (attendeeId: string, override?: string) => {
    if (!event) return;

    const attendee = event.cycling_attendees?.find((p) => p.id_uuid === attendeeId);
    if (!attendee) {
      toast({
        title: "Error",
        description: "Attendee not found.",
        variant: "destructive",
      });
      return;
    }

    const code = override ?? checkinCodes[attendeeId];
    if (!code || code.length !== 6) {
      setCheckinCodeErrors((prev) => ({
        ...prev,
        [attendeeId]: "Please enter a 6-digit code",
      }));
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setCheckingInAttendees((prev) => ({ ...prev, [attendeeId]: true }));
    setLoading(true);

    try {
      console.log('Checking in attendee:', { attendeeId, code });

      // Update attendee status using confirmation code and event ID
      const { error: updateError } = await supabase
        .from("cycling_attendees")
        .update({ 
          status: "checked_in",
          updated_at: new Date().toISOString()
        })
        .eq("confirmation_code", code)
        .eq("cycling_event_id_uuid", event.id_uuid)
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update attendee status: ${updateError.message}`);
      }

      // Update local state
      setAttendeeStatuses((prev: AttendeeStatus[]) => (
        [...prev.map((status: AttendeeStatus) =>
          status.id_uuid === attendeeId
            ? { ...status, status: "checked_in" }
            : status
        )] as AttendeeStatus[]
      ));

      // Refresh event data to get updated status
      await fetchEvent();

      setCheckinAttendee({
        id: attendeeId,
        name: attendee.attendee_name,
        slots: Number(attendee.number_of_slots) || 1,
      });
      setCheckinDialogOpen(true);

      toast({
        title: "Success",
        description: `${attendee.attendee_name} has been checked in successfully.`,
      });
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: "Failed to check in attendee. Please try again.",
        variant: "destructive",
      });
      // Revert UI state if update failed
      setAttendeeStatuses((prev) =>
        prev.map((status) =>
          status.id_uuid === attendeeId
            ? { ...status, status: attendee.status }
            : status
        )
      );
    } finally {
      setCheckingInAttendees((prev) => ({ ...prev, [attendeeId]: false }));
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "registered":
        return "bg-[#FEF9C3] text-[#A16207] border-transparent";
      case "checked_in":
        return "bg-[#DCFCE7] text-[#15803D] border-transparent";
      case "absent":
        return "bg-[#FEE2E2] text-[#B91C1C] border-transparent";
      default:
        return "bg-sc-soft text-sc-ink2 border-transparent";
    }
  };

  const getDisplayStatus = (status: string) => {
    return status.toLowerCase() === "absent" ? "No Show" : 
           status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const [filter, setFilter] = useState<"all" | "waiting" | "in">("all");

  if (!event) return null;

  const riders = event.cycling_attendees || [];
  const statusOf = (r: NonNullable<CyclingEvent["cycling_attendees"]>[number]) =>
    attendeeStatuses.find((x) => x.id_uuid === r.id_uuid)?.status || r.status || "registered";
  const inCount = riders.filter((r) => statusOf(r) === "checked_in").length;
  const spots = riders.reduce((n, r) => n + (Number(r.number_of_slots) || 1), 0);
  const shown = riders.filter((r) => (filter === "all" ? true : filter === "in" ? statusOf(r) === "checked_in" : statusOf(r) !== "checked_in"));
  const pillSport = (st: string): Sport => (st === "checked_in" ? "football" : st === "absent" ? "red" : "tennis");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2.5">
        <StatCard value={`${spots}/${event.max_attendees || 0}`} label="Spots filled" icon={Users} sport="cycling" />
        <StatCard value={inCount} label="Checked in" icon={CheckCircle2} sport="money" />
        <StatCard value={riders.length - inCount} label="Waiting" icon={Clock} sport="tennis" />
      </div>

      {mode === "checkin" ? (
        <div className="bg-sc-ink text-white rounded-3xl p-4 flex flex-col gap-3">
          <span className="flex flex-col">
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#FED7AA]">CHECK IN IS ON</span>
            <span className="text-sm text-white/80">Scan a rider's QR ticket, or type their 6 digit code below.</span>
          </span>
          <div className="flex gap-2">
            <ScButton kind="cycling" size="md" icon={ScanLine} onClick={() => setScanOpen(true)}>Scan QR</ScButton>
            <ScButton kind="white" size="md" full={false} className="px-6" onClick={() => setMode(null)}>Done</ScButton>
          </div>
        </div>
      ) : (
        <ScButton kind="cycling" icon={QrCode} onClick={handleCheckinMode} disabled={loading}>Check in riders</ScButton>
      )}

      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-[-0.01em]">Riders</span>
          <span className="text-sm font-bold text-sc-ink3">{riders.length} registered</span>
        </div>
        {riders.length > 0 && (
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as "all" | "waiting" | "in")}
            options={[
              { value: "all", label: `All ${riders.length}` },
              { value: "waiting", label: `Waiting ${riders.length - inCount}` },
              { value: "in", label: `In ${inCount}` },
            ]}
          />
        )}
        {riders.length === 0 ? (
          <EmptyState icon={Bike} sport="cycling" title="No riders yet" subtitle="Share the ride link. Riders show up here as soon as they join." />
        ) : shown.length === 0 ? (
          <EmptyState icon={filter === "in" ? CheckCircle2 : Clock} sport="gray" title={filter === "in" ? "Nobody checked in yet" : "Everyone is in"} />
        ) : (
          <div className="flex flex-col divide-y divide-sc-line">
            {shown.map((r) => {
              const st = statusOf(r);
              const busy = !!checkingInAttendees[r.id_uuid] || loading;
              return (
                <div key={r.id_uuid} className="py-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(r.attendee_name)} seed={r.attendee_name} size={42} sport="cycling" />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[15px] font-bold truncate">{r.attendee_name}</span>
                      <span className="text-[13px] text-sc-ink3 truncate">
                        {(Number(r.number_of_slots) || 1) > 1 ? `${r.number_of_slots} spots · ` : ""}
                        {r.is_own_bike ? "Own bike · " : r.is_rental_bike ? "Rental bike · " : ""}
                        {r.attendee_phone || "No phone"}
                      </span>
                    </span>
                    <Pill sport={pillSport(st)}>{getDisplayStatus(st) === "Registered" ? "Waiting" : getDisplayStatus(st)}</Pill>
                  </div>
                  {mode === "checkin" && st === "registered" && canConfirmAttendees && (
                    <div className="flex gap-2 pl-[54px]">
                      <Input
                        placeholder="6 digit code"
                        value={checkinCodes[r.id_uuid] || ""}
                        onChange={(e) => handleCheckinCodeChange(r.id_uuid, e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="h-11 flex-1 tracking-[0.3em] font-bold placeholder:tracking-normal placeholder:font-semibold"
                        disabled={busy}
                      />
                      <ScButton size="sm" full={false} kind="cycling" className="h-11 px-5" onClick={() => handleCheckin(r.id_uuid)} disabled={!checkinCodes[r.id_uuid] || checkinCodes[r.id_uuid].length !== 6 || busy}>
                        {checkingInAttendees[r.id_uuid] ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                      </ScButton>
                    </div>
                  )}
                  {checkinCodeErrors[r.id_uuid] && <p className="m-0 pl-[54px] text-xs font-bold text-sport-red-fg">{checkinCodeErrors[r.id_uuid]}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QrScannerDialog open={scanOpen} onOpenChange={setScanOpen} onCode={handleScannedCode} hint="Point the camera at the QR code on the rider's ticket" />

      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[380px] rounded-[28px] bg-white p-6 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-sport-cycling text-white flex items-center justify-center"><Check size={28} strokeWidth={3} /></span>
          <DialogTitle className="text-xl font-extrabold">Checked in</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">
            {checkinAttendee && <>{checkinAttendee.name} is in with {checkinAttendee.slots} spot{checkinAttendee.slots !== 1 ? "s" : ""}.</>}
          </DialogDescription>
          <ScButton kind="cycling" onClick={() => setCheckinDialogOpen(false)}>Next rider</ScButton>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendeesManagement;
