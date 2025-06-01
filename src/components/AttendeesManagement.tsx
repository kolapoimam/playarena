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

type AttendeeStatus = {
  id_uuid: string;
  attendee_status: "registered" | "checked_in" | "absent";
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
          .select('id_uuid, attendee_status, confirmation_code')
          .eq('cycling_event_id_uuid', event.id_uuid);

        if (error) throw error;

        const initialStatuses = attendeesData.map(attendee => ({
          id_uuid: attendee.id_uuid,
          attendee_status: (attendee.attendee_status || 'registered') as "registered" | "checked_in" | "absent",
          checkinCode: checkinCodes[attendee.id_uuid] || ''
        }));
        setAttendeeStatuses(initialStatuses);

        // Check if event is past 24 hours and update statuses
        const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
        const checkTime = addDays(eventDateTime, 1);
        if (isPast(checkTime) && attendeesData.length > 0) {
          const registeredAttendees = attendeesData.filter(a => a.attendee_status === 'registered');
          if (registeredAttendees.length > 0) {
            try {
              const { error: updateError } = await supabase
                .from('cycling_attendees')
                .update({ 
                  attendee_status: 'absent',
                  updated_at: new Date().toISOString()
                })
                .eq('cycling_event_id_uuid', event.id_uuid)
                .eq('attendee_status', 'registered');

              if (updateError) throw updateError;

              setAttendeeStatuses(prev =>
                prev.map(status =>
                  registeredAttendees.some(a => a.id_uuid === status.id_uuid)
                    ? { ...status, attendee_status: 'absent' }
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
        if (event?.attendees) {
          const initialStatuses = event.attendees.map(attendee => ({
            id_uuid: attendee.id_uuid,
            attendee_status: (attendee.attendee_status || 'registered') as "registered" | "checked_in" | "absent",
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
        () => {
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
    if (!event || event.cancellation_status || !event.attendees?.length) return false;
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const checkTime = addDays(eventDateTime, 1);
    const hasRegisteredAttendees = event.attendees?.some(a => a.attendee_status === "registered");
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
      const reason = !event.attendees?.length
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

  const handleCheckinCodeChange = (attendeeId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes((prev) => ({ ...prev, [attendeeId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors((prev) => ({
      ...prev,
      [attendeeId]: validation.success ? null : validation.error?.errors[0].message,
    }));
  };

  const handleCheckin = async (attendeeId: string) => {
    if (!event) return;

    const attendee = event.attendees?.find((p) => p.id_uuid === attendeeId);
    if (!attendee) {
      toast({
        title: "Error",
        description: "Attendee not found.",
        variant: "destructive",
      });
      return;
    }

    const code = checkinCodes[attendeeId];
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

      // Verify attendee and current status
      const { data, error } = await supabase
        .from("cycling_attendees")
        .select("id_uuid, confirmation_code, attendee_status")
        .eq("id_uuid", attendeeId)
        .single();

      if (error || !data) {
        console.error('Select error:', error);
        throw new Error("Attendee not found in database");
      }

      if (data.attendee_status !== "registered") {
        throw new Error("Attendee is already checked in or marked absent");
      }

      if (data.confirmation_code !== code) {
        throw new Error("Invalid confirmation code");
      }

      // Update attendee status (one-time check-in)
      const { error: updateError, data: updateData } = await supabase
        .from("cycling_attendees")
        .update({ attendee_status: "checked_in" })
        .eq("id_uuid", attendeeId)
        .select("id_uuid, attendee_status")
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error("Failed to update attendee status");
      }

      if (!updateData) {
        throw new Error("Failed to update attendee status");
      }

      // Update local state
      setAttendeeStatuses((prev) =>
        prev.map((status) =>
          status.id_uuid === attendeeId
            ? { ...status, attendee_status: "checked_in" }
            : status
        )
      );

      // Update event attendees
      const updatedEvent = {
        ...event,
        attendees: event.attendees?.map((a) =>
          a.id_uuid === attendeeId ? { ...a, attendee_status: "checked_in" } : a
        ),
      };
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

      // Clear check-in code and errors
      setCheckinCodes((prev) => {
        const newCodes = { ...prev };
        delete newCodes[attendeeId];
        return newCodes;
      });

      setCheckinCodeErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[attendeeId];
        return newErrors;
      });
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in attendee",
        variant: "destructive",
      });
    } finally {
      setCheckingInAttendees((prev) => ({ ...prev, [attendeeId]: false }));
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "registered":
        return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-600";
      case "checked_in":
        return "bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-200 dark:border-green-600";
      case "absent":
        return "bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-200 dark:border-red-600";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600";
    }
  };

  const getDisplayStatus = (status: string) => {
    return status === "absent" ? "No Show" : status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Manage Attendees
      </h2>

      <div className="mb-6">
        <Button
          onClick={handleCheckinMode}
          className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white w-full sm:w-auto"
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

      <div className="space-y-4">
        <button
          onClick={() => setIsAttendeesOpen(!isAttendeesOpen)}
          className="flex items-center justify-between w-full text-left text-lg font-semibold mb-2 text-gray-900 dark:text-white"
        >
          <span>Attendees ({event.attendees?.length || 0})</span>
          {isAttendeesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isAttendeesOpen && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {event.attendees?.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No attendees registered.
              </p>
            ) : (
              event.attendees?.map((attendee) => (
                <div
                  key={attendee.id_uuid}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {attendee.attendee_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {attendee.attendee_phone || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Slots: {Number(attendee.number_of_slots) || 1}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`inline-block px-2 py-1 text-sm font-medium rounded border ${getStatusStyles(attendee.attendee_status)}`}
                      >
                        {getDisplayStatus(attendee.attendee_status)}
                      </span>
                      {mode === "checkin" && attendee.attendee_status === "registered" && canConfirmAttendees && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="6-digit code"
                            value={checkinCodes[attendee.id_uuid] || ""}
                            onChange={(e) =>
                              handleCheckinCodeChange(attendee.id_uuid, e.target.value)
                            }
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            className="w-32 text-sm dark:bg-gray-700 dark:text-gray-100"
                            disabled={checkingInAttendees[attendee.id_uuid] || loading}
                          />
                          <Button
                            onClick={() => handleCheckin(attendee.id_uuid)}
                            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded"
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
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {mode === "checkin" && (
        <Button
          onClick={() => setMode(null)}
          className="mt-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
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
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md"
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
