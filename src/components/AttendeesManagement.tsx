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
import { isPast, addHours } from "date-fns";

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
  handleCancel: () => void;
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
  handleCancel,
  navigate,
}: AttendeesManagementProps) => {
  const { toast } = useToast();
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinAttendee, setCheckinAttendee] = useState<{
    id: string;
    name: string;
    slots: number;
  } | null>(null);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(true);
  const [checkingInAttendees, setCheckingInAttendees] = useState<{
    [key: string]: boolean;
  }>({});
  const [localTempIdentifier, setLocalTempIdentifier] = useState(tempIdentifier);

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
  }, [tempIdentifier]);

  useEffect(() => {
    if (!event?.attendees) return;

    const initialStatuses = event.attendees.map((attendee) => ({
      id_uuid: attendee.id_uuid,
      attendee_status: attendee.attendee_status as "registered" | "checked_in" | "absent",
      checkinCode: checkinCodes[attendee.id_uuid] || "",
    }));
    setAttendeeStatuses(initialStatuses);

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
          fetchEvent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.attendees, setAttendeeStatuses, checkinCodes, event?.id_uuid, fetchEvent]);

  const canCheckin = () => {
    if (!event || event.cancellation_status || !event.attendees?.length)
      return false;
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const eventEndTime = addHours(eventDateTime, 2);
    return !isPast(eventEndTime);
  };

  const handleCheckinCodeChange = (attendeeId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes(((prev) => {
      const newCodes = { ...prev, [attendeeId]: numericCode };
      return newCodes;
    }) as any);
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors(((prev) => {
      return {
        ...prev,
        [attendeeId]: validation.success || numericCode === "" ? null : validation.error.errors[0].message,
      };
    }) as any);
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
    if (!code) {
      setCheckinCodeErrors(((prev) => ({
        ...prev,
        [attendeeId]: "Please enter a check-in code",
      })) as any);
      return;
    }

    if (code !== attendee.confirmation_code) {
      setCheckinCodeErrors(((prev) => ({
        ...prev,
        [attendeeId]: "Invalid check-in code",
      })) as any);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("cycling_attendees")
        .update({
          attendee_status: "checked_in",
          updated_at: new Date().toISOString(),
        })
        .eq("id_uuid", attendeeId);

      if (error) throw error;

      setAttendeeStatuses(((prev) =>
        prev.map((status) =>
          status.id_uuid === attendeeId
            ? { ...status, attendee_status: "checked_in" }
            : status
        )
      ) as any);

      setCheckinCodes(((prev) => {
        const newCodes = { ...prev };
        delete newCodes[attendeeId];
        return newCodes;
      }) as any);

      setCheckinCodeErrors(((prev) => {
        const newErrors = { ...prev };
        delete newErrors[attendeeId];
        return newErrors;
      }) as any);

      toast({
        title: "Success",
        description: "Attendee checked in successfully.",
      });
    } catch (error: any) {
      console.error("Error checking in attendee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in attendee.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async (attendeeId: string) => {
    if (!event) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("cycling_attendees")
        .update({
          attendee_status: "absent",
          updated_at: new Date().toISOString(),
        })
        .eq("id_uuid", attendeeId);

      if (error) throw error;

      setAttendeeStatuses(((prev) =>
        prev.map((status) =>
          status.id_uuid === attendeeId
            ? { ...status, attendee_status: "absent" }
            : status
        )
      ) as any);

      setCheckinCodes(((prev) => {
        const newCodes = { ...prev };
        delete newCodes[attendeeId];
        return newCodes;
      }) as any);

      setCheckinCodeErrors(((prev) => {
        const newErrors = { ...prev };
        delete newErrors[attendeeId];
        return newErrors;
      }) as any);

      toast({
        title: "Success",
        description: "Attendee marked as absent.",
      });
    } catch (error: any) {
      console.error("Error marking attendee as absent:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendee as absent.",
        variant: "destructive",
      });
    } finally {
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

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Manage Attendees
      </h2>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Button
          onClick={() => {
            if (canCheckin()) {
              setIsAttendeesOpen(true);
            } else {
              toast({
                title: "Check-in Unavailable",
                description: "Check-in is not available for this event.",
                variant: "destructive",
              });
            }
          }}
          className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white flex-1"
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
        <Button
          onClick={handleCancel}
          className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white flex-1"
          disabled={event.cancellation_status || isEventPast || loading}
        >
          Cancel Event
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
                        {attendee.attendee_status
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {canConfirmAttendees && attendee.attendee_status !== "checked_in" && (
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
                              "Check In"
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
