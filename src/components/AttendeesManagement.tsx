import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { isPast, addHours } from 'date-fns';

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  total_slots: number;
  host_name: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  attendees: {
    id: string;
    attendee_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type AttendeeStatus = {
  id: string;
  status: 'registered' | 'checked_in' | 'absent';
  checkinCode: string;
};

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

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
  handleCancelEvent: () => void;
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
  handleCancelEvent,
  navigate,
}: AttendeesManagementProps) => {
  const { toast } = useToast();
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinAttendee, setCheckinAttendee] = useState<{ id: string; name: string; slots: number } | null>(null);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(true);
  const [checkingInAttendees, setCheckingInAttendees] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!event?.attendees) return;

    const initialStatuses = event.attendees.map(attendee => ({
      id: attendee.id,
      status: attendee.status as 'registered' | 'checked_in' | 'absent',
      checkinCode: checkinCodes[attendee.id] || '',
    }));
    setAttendeeStatuses(initialStatuses);
  }, [event?.attendees, setAttendeeStatuses]);

  const canCheckin = () => {
    if (!event || event.cancellation_status || !event.attendees?.length) return false;
    const eventEndTime = event.event_end_time
      ? new Date(event.event_end_time)
      : addHours(new Date(`${event.event_date}T${event.event_time}`), 2);
    return !isPast(eventEndTime);
  };

  const handleCheckinCodeChange = (attendeeId: string, code: string) => {
    const numericCode = code.replace(/[^0-9]/g, "").slice(0, 6);
    setCheckinCodes(prev => ({ ...prev, [attendeeId]: numericCode }));
    const validation = codeSchema.safeParse(numericCode);
    setCheckinCodeErrors(prev => ({
      ...prev,
      [attendeeId]: validation.success || numericCode === '' ? null : validation.error.errors[0].message,
    }));
  };

  const validateCheckinCode = async (attendeeId: string) => {
    const code = checkinCodes[attendeeId];
    if (!code) {
      toast({
        title: "Invalid Code",
        description: "Please enter a check-in code.",
        variant: "destructive",
      });
      return;
    }

    const validation = codeSchema.safeParse(code);
    if (!validation.success) {
      setCheckinCodeErrors(prev => ({ ...prev, [attendeeId]: validation.error.errors[0].message }));
      return;
    }

    const attendee = event?.attendees?.find(p => p.id === attendeeId);
    if (!attendee) {
      toast({
        title: "Error",
        description: "Attendee not found.",
        variant: "destructive",
      });
      return;
    }

    setCheckingInAttendees(prev => ({ ...prev, [attendeeId]: true }));
    setLoading(true);

    try {
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendees')
        .select('id, confirmation_code, status')
        .eq('id', attendeeId)
        .single();

      if (attendeeError || !attendeeData) {
        throw new Error(attendeeError?.message || "Attendee not found.");
      }

      if (attendeeData.status === 'checked_in') {
        throw new Error("Attendee is already checked in.");
      }

      if (attendeeData.status === 'absent') {
        throw new Error("Attendee is marked as absent.");
      }

      if (attendeeData.confirmation_code !== code) {
        throw new Error("Invalid confirmation code.");
      }

      const { error: updateError } = await supabase
        .from('attendees')
        .update({
          status: 'checked_in',
          updated_at: new Date().toISOString(),
        })
        .eq('id', attendeeId);

      if (updateError) throw updateError;

      if (event.is_paid && event.price) {
        const slots = attendee.number_of_slots || 1;
        const amount = slots * event.price;

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (userId) {
          const { error: walletError } = await supabase.rpc('update_wallet_balance', {
            p_organizer_id: userId,
            p_amount: amount,
            p_operation: 'add',
          });

          if (walletError) {
            console.error('Wallet update error:', walletError);
            toast({
              title: "Warning",
              description: "Attendee checked in, but failed to update wallet balance.",
variant: "destructive",
            });
          }
        }
      }

      setAttendeeStatuses(prev =>
        prev.map(s => s.id === attendeeId ? { ...s, status: 'checked_in' } : s)
      );

      setCheckinAttendee({
        id: attendeeId,
        name: attendee.attendee_name,
        slots: attendee.number_of_slots || 1,
      });
      setCheckinDialogOpen(true);

      setCheckinCodes(prev => ({ ...prev, [attendeeId]: '' }));
      setCheckinCodeErrors(prev => ({ ...prev, [attendeeId]: null }));

      await fetchEvent();

      toast({
        title: "Success",
        description: `${attendee.attendee_name} has been checked in.`,
      });
    } catch (error: any) {
      setCheckinCodeErrors(prev => ({ ...prev, [attendeeId]: error.message }));
      toast({
        title: "Error",
        description: error.message || "Failed to check in attendee.",
        variant: "destructive",
      });
    } finally {
      setCheckingInAttendees(prev => ({ ...prev, [attendeeId]: false }));
      setLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'checked_in':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manage Attendees</h2>

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
          className="bg-green-500 hover:bg-green-600 text-white flex-1"
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
            onClick={handleCancelEvent}
            className="bg-red-500 hover:bg-red-600 text-white flex-1"
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
            <span>Attendees ({event.attendees?.maplength || 0})</span>
            {isAttendeesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isAttendeesOpen && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {event.attendees?.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center">No attendees registered.</p>
              ) : (
                event.attendees.map(attendee => (
                  <div key={attendee.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-medium text-gray-900 dark:text-white">{attendee.attendee_name}</p>
                        <p className="text-sm text-600 dark:text-gray-400">
                          Phone: {attendee.details?.phone || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Slots: {attendee.number_of_slots || 1}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1 px-sm text-sm font-sm rounded border ${getStatusStyles(attendee.status)}`}>
                          {attendee.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        {canConfirmAttendees && attendee.status !== 'checked_in' && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="6-digit code"
                              value={checkinCodes[attendee.id] || ''}
                              onChange={(e) => handleCheckinCodeChange(attendee.id, e.target.value)}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              className="w-32 text-sm rounded-md"
                              disabled={checkingInAttendees[attendee.id] || loading}
                            />
<Button
  onClick={() => validateCheckinCode(attendee.id)}
  className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-md"
  disabled={
    !checkinCodes[attendee.id] ||
    checkinCodes[attendee.id].length !== 6 ||
    checkingInAttendees[attendee.id] ||
    loading
  }
>
  {checkingInAttendees[attendee.id] ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    "Verify"
  )}
</Button>
                          </div>
                        )}
                        {checkinCodeErrors[attendee.id] && (
                          <p className="text-sm text-red-600 mt-1">{checkinCodeErrors[attendee.id]}</p>
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
                    {checkinAttendee.name} has been checked in with {checkinAttendee.slots} slot{checkinAttendee.slots !== 1 ? 's' : ''}.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setCheckinDialogOpen(false)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );

    export default AttendeesManagement;
