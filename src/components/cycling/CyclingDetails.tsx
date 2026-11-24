import { format, differenceInMinutes } from "date-fns";
import { Bike, MapPin, Calendar, Clock, Users, Wallet, Banknote, Flag, XCircle } from "lucide-react";
import { ListGroup, ListRow, Pill, Progress, ScButton, StatCard, formatNairaExact, type Sport } from "@/components/sc/ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  start_time?: string | null;
  end_time?: string | null;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  start_landmark_name: string;
  status: string;
  start_landmark_id: string;
  duration_type: string;
  duration_value: number;
  is_own_bike: boolean;
  is_rental_available: boolean;
  notes?: string | null;
  start_landmark: Landmark;
  end_landmark?: Landmark | null;
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  cycling_event_id_uuid: string;
  supercode: string;
  total_amount_paid: number;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
  host_id: string;
  created_at: string;
  updated_at: string;
};

type CyclingDetailsProps = {
  event: CyclingEvent | null;
  cashout: Cashout | null;
  handleCancel: () => void;
  loading: boolean;
  isEventPast: boolean;
  walletBalance: number;
};

const CyclingDetails = ({ event: initialEvent, cashout, handleCancel, loading, isEventPast, walletBalance }: CyclingDetailsProps) => {
  const { toast } = useToast();
  const [localWalletBalance, setLocalWalletBalance] = useState<number>(walletBalance || 0);
  const [event, setEvent] = useState<CyclingEvent | null>(initialEvent);

const fetchEventDetails = async () => {
  if (!initialEvent?.id_uuid) return;
  try {
    const { data: eventData, error: eventError } = await supabase
      .from("cycling_events")
      .select(`
        id_uuid,
        slug,
        title,
        event_date,
        start_time,
        end_time,
        max_attendees,
        host_id,
        host_name,
        host_phone,
        supercode,
        is_free,
        price,
        cancellation_status,
        status,
        start_landmark_id,
        start_landmark_name,
        cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey (
          id_uuid,
          attendee_name,
          attendee_phone,
          status,
          confirmation_code,
          number_of_slots
        )
      `)
      .eq("id_uuid", initialEvent.id_uuid)
      .single();

    if (eventError) {
      console.error("Event fetch error:", eventError);
      throw eventError;
    }

    setEvent(eventData as CyclingEvent);
  } catch (error) {
    console.error("Error fetching event details:", error);
    toast({
      title: "Error",
      description: "Failed to fetch event details. Please try again.",
      variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [initialEvent]);

  useEffect(() => {
    if (!event) {
      setLocalWalletBalance(0);
      return;
    }

    const fetchWalletBalance = async () => {
      try {
        let balance = 0;

        // Fetch attendees
        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("status, number_of_slots")
          .eq("cycling_event_id_uuid", event.id_uuid);

        if (attendeesError) {
          console.error("Attendees fetch error:", attendeesError);
          throw attendeesError;
        }

        if (!event.is_free && event.price) {
          const checkedInAttendees = attendeesData?.filter((a) => a?.status === "checked_in") || [];
          balance = checkedInAttendees.reduce(
            (sum, attendee) => sum + ((Number(attendee.number_of_slots) || 1) * (event.price || 0)),
            0
          );
        }

        // Fetch wallet balance
const { data: walletData, error: walletError } = await supabase
  .from("cycling_wallets")
  .select("balance")
  .eq("host_id", event.host_id)
  .maybeSingle();

if (walletError) {
  console.error("Wallet fetch error:", walletError);
  balance = defaultBalance; // Use calculated balance
} else if (walletData?.balance !== undefined) {
  balance = walletData.balance;
} else {
  balance = defaultBalance; // No wallet found
}

        if (balance < 0) balance = 0;
        setLocalWalletBalance(balance);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        toast({
          title: "Error",
          description: "Failed to calculate wallet balance. Please try again.",
          variant: "destructive",
        });
        setLocalWalletBalance(0);
      }
    };

    fetchWalletBalance();

    const attendeesChannel = supabase
      .channel(`attendees_event_${event.id_uuid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cycling_attendees',
          filter: `cycling_event_id_uuid=eq.${event.id_uuid}`,
        },
        () => {
          fetchWalletBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendeesChannel);
    };
  }, [event, toast]);

  const canCancelEvent = () => {
    if (!event) return false;
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(eventDateTime, now);
    const hasCheckedInAttendees = event.cycling_attendees?.some((a) => a.status === "checked_in") || false;
    return minutesToStart > 0 && !event.cancellation_status && !hasCheckedInAttendees;
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeString;
    let [_, hours, minutes, period] = match;
    return `${parseInt(hours)}:${minutes} ${period.toUpperCase()}`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-sc-green-bg text-sc-green-dark border-green-300";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "Processed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Review":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
  };

  const calculateExpectedAmount = () => {
    if (!event) return "N/A";
    let total = 0;
    if (!event.is_free && event.price) {
      const checkedInAttendees = event.cycling_attendees?.filter((a) => a?.status === "checked_in") || [];
      total = checkedInAttendees.reduce(
        (sum, attendee) => sum + ((Number(attendee?.number_of_slots) || 1) * (event.price || 0)),
        0
      );
    }
    return `₦${total.toLocaleString()}`;
  };

  const calculateTotalSlotsOccupied = () => {
    if (!event || !event.cycling_attendees) return 0;
    return event.cycling_attendees.reduce((sum, attendee) => sum + (Number(attendee?.number_of_slots) || 1), 0);
  };

  if (!event) return null;

  const taken = calculateTotalSlotsOccupied();
  const total = event.max_attendees || 0;
  const start = new Date(`${event.event_date}T${/am|pm/i.test(event.start_time || "") ? "12:00" : event.start_time}`);
  const state = event.cancellation_status ? "Cancelled" : isEventPast ? "Ended" : "Upcoming";
  const stateSport: Sport = state === "Cancelled" ? "red" : state === "Ended" ? "gray" : "guide";
  const cancelReason = event.cancellation_status
    ? "This ride is already cancelled."
    : !canCancelEvent()
      ? "You can only cancel before the ride starts and before anyone checks in."
      : null;
  const place = event.start_landmark?.name || event.start_landmark_name;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-sport-cycling-fg text-white rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden">
        <svg aria-hidden="true" className="absolute -right-6 -top-6 opacity-20" width="180" height="160" viewBox="0 0 180 160" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"><path d="M10 150 C 70 130 60 70 120 60 S 170 20 200 0" strokeDasharray="2 14" /></svg>
        <div className="flex flex-wrap gap-1.5 relative">
          <Pill sport={stateSport}>{state}</Pill>
          <Pill sport={event.is_free ? "football" : "tennis"}>{event.is_free ? "Free" : "Paid"}</Pill>
          {cashout && <Pill sport="tennis">Cashout {cashout.status.toLowerCase()}</Pill>}
        </div>
        <div className="relative flex flex-col gap-1">
          <span className="text-[26px] leading-8 font-extrabold tracking-[-0.03em] line-clamp-2">{event.title || "Untitled ride"}</span>
          <span className="text-sm text-white/80">Hosted by {event.host_name || "you"}</span>
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-white/80"><span>{taken} of {total} spots filled</span><span>{total ? Math.round((taken / total) * 100) : 0}%</span></div>
          <Progress value={total ? (taken / total) * 100 : 0} color="#FFFFFF" track="rgba(255,255,255,0.25)" />
        </div>
      </div>

      <div className="flex gap-2.5">
        <StatCard value={formatNairaExact(localWalletBalance || 0)} label="In your wallet" icon={Wallet} sport="money" />
        <StatCard value={event.is_free ? "Free" : formatNairaExact(event.price || 0)} label={event.is_free ? "Entry" : "Per rider"} icon={Banknote} sport="tennis" />
      </div>

      <ListGroup title="Ride info">
        <ListRow icon={MapPin} sport="cycling" title={place || "Start point not set"} subtitle="Start" />
        {event.end_landmark?.name && <ListRow icon={Flag} sport="cycling" title={event.end_landmark.name} subtitle="Finish" />}
        <ListRow icon={Calendar} sport="guide" title={event.event_date ? formatDate(event.event_date) : "Date not set"} subtitle="Date" />
        <ListRow icon={Clock} sport="football" title={event.start_time ? formatTime(event.start_time) : "Time not set"} subtitle="Starts" />
        <ListRow icon={Users} sport="pink" title={`${taken}/${total} spots`} subtitle={`${(event.cycling_attendees || []).length} riders registered`} />
      </ListGroup>

      {event.cancellation_status && !event.is_free && (
        <div className="bg-sport-red-bg text-sport-red-fg rounded-3xl p-4 text-sm font-bold">This ride was cancelled. Paid riders will be contacted for a refund.</div>
      )}

      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-2.5">
        <span className="text-base font-extrabold">Cancel ride</span>
        <span className="text-sm text-sc-ink3 leading-5">{cancelReason || "Riders are told straight away. Paid riders are refunded."}</span>
        <ScButton kind="danger" size="md" icon={XCircle} onClick={handleCancel} disabled={!!cancelReason || loading}>Cancel this ride</ScButton>
      </div>
    </div>
  );
};

export default CyclingDetails;
