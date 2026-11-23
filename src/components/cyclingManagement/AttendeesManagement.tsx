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
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] dark:border-gray-700">
      <h2 className="text-lg font-extrabold tracking-[-0.01em] mb-4 text-sc-ink dark:text-gray-100">
        Manage Attendees
      </h2>

      <div className="mb-4">
        <Button
          onClick={handleCheckinMode}
          className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
          disabled={!canCheckin() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            "Check-in Attendees"
          )}
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <button
          onClick={() => setIsAttendeesOpen(!isAttendeesOpen)}
          className="flex items-center gap-2 w-full text-left text-lg font-semibold text-sc-ink dark:text-gray-100 mb-4"
        >
          Attendees ({event.cycling_attendees?.length || 0})
          {isAttendeesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {mode === "checkin" && (
          <div className="mb-4">
            <QrScanButton label="Scan rider QR code" onClick={() => setScanOpen(true)} />
          </div>
        )}
        {isAttendeesOpen && (
          <div className="space-y-4">
            {event.cycling_attendees?.length === 0 ? (
              <p className="text-sc-ink3 dark:text-gray-400">
                No attendees registered.
              </p>
            ) : (
              event.cycling_attendees?.map((attendee) => {
                const currentStatus = attendeeStatuses.find(s => s.id_uuid === attendee.id_uuid)?.status || attendee.status;
                return (
                  <div
                    key={attendee.id_uuid}
                    className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-sc-soft dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sc-ink dark:text-gray-100">{attendee.attendee_name}</p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Phone: {attendee.attendee_phone || "N/A"}
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Slots: {Number(attendee.number_of_slots) || 1}
                      </p>
                      {attendee.is_own_bike && (
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Own Bike
                        </p>
                      )}
                      {attendee.is_rental_bike && (
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Rental Bike
                        </p>
                      )}
                    </div>
                    <span
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded border ${getStatusStyles(currentStatus)}`}
                    >
                      {getDisplayStatus(currentStatus)}
                    </span>
                    {mode === "checkin" && currentStatus === "registered" && canConfirmAttendees && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Input
                          placeholder="Enter check-in code"
                          value={checkinCodes[attendee.id_uuid] || ""}
                          onChange={(e) =>
                            handleCheckinCodeChange(attendee.id_uuid, e.target.value)
                          }
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          className="w-full sm:w-[150px] dark:bg-gray-700 dark:text-gray-100"
                          disabled={checkingInAttendees[attendee.id_uuid] || loading}
                        />
                        <Button
                          onClick={() => handleCheckin(attendee.id_uuid)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          disabled={
                            !checkinCodes[attendee.id_uuid] ||
                            checkinCodes[attendee.id_uuid].length !== 6 ||
                            checkingInAttendees[attendee.id_uuid] ||
                            loading
                          }
                        >
                          {checkingInAttendees[attendee.id_uuid] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    )}
                    {checkinCodeErrors[attendee.id_uuid] && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {checkinCodeErrors[attendee.id_uuid]}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {mode === "checkin" && (
        <Button
          onClick={() => setMode(null)}
          className="mt-4 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Done"
          )}
        </Button>
      )}

      <QrScannerDialog open={scanOpen} onOpenChange={setScanOpen} onCode={handleScannedCode} hint="Point the camera at the QR code on the rider's ticket" />

      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Check-in Successful</DialogTitle>
            <DialogDescription>
              {checkinAttendee && (
                <>
                  {checkinAttendee.name} has been checked in with{" "}
                  {checkinAttendee.slots} slot
                  {checkinAttendee.slots !== 1 ? "s" : ""}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setCheckinDialogOpen(false)}
              className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendeesManagement;
