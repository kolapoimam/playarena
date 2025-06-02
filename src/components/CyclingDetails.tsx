import { format, differenceInMinutes } from "date-fns";
import { Bike, MapPin, Calendar, Clock, Users, DollarSign, Wallet } from "lucide-react";
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
  start_landmark: {
    name: string;
    state: string;
    description?: string | null;
    map_link?: string | null;
  } | null;
  attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  cycling_event_id_uuid: string;
  super_code: string;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
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

  // Fetch event details with landmark data
  const fetchEventDetails = async () => {
    if (!initialEvent?.id_uuid) return;
    try {
      const { data, error } = await supabase
        .from("cycling_events")
        .select(`
          id_uuid,
          slug,
          title,
          event_date,
          start_time,
          event_start_time,
          event_end_time,
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
          start_landmark:landmarks (
            name,
            state,
            description,
            map_link
          ),
          attendees (
            id_uuid,
            attendee_name,
            attendee_phone,
            status,
            confirmation_code,
            details,
            number_of_slots
          )
        `)
        .eq("id_uuid", initialEvent.id_uuid)
        .single()
        .throwOnError();

      if (error) throw error;

      setEvent(data as CyclingEvent);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch event details.",
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
        const { data: attendeesData, error } = await supabase
          .from("cycling_attendees")
          .select("status")
          .eq("cycling_event_id_uuid", event.id_uuid)
          .throwOnError();

        if (error) throw error;

        let balance = 0;
        if (!event.is_free && event.price) {
          const checkedInAttendees = attendeesData?.filter((a) => a?.status === "checked_in") || [];
          balance = checkedInAttendees.reduce(
            (sum, attendee) => sum + (event.price || 0),
            0
          );
        }

        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("organizer_id", event.host_id)
          .single()
          .throwOnError();

        if (walletError) {
          console.error("Wallet fetch error:", walletError);
        } else if (walletData) {
          balance = walletData.balance;
        }

        setLocalWalletBalance(balance < 0 ? 0 : balance);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        toast({
          title: "Error",
          description: "Failed to calculate wallet balance.",
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
    const hasCheckedInAttendees = event.attendees?.some((a) => a.status === "checked_in") || false;
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
        return "bg-green-100 text-green-700 border-green-300";
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
      const checkedInAttendees = event.attendees?.filter((a) => a?.status === "checked_in") || [];
      total = checkedInAttendees.reduce(
        (sum, attendee) => sum + ((Number(attendee?.number_of_slots) || 1) * (event.price || 0)),
        0
      );
    }
    return `₦${total.toLocaleString()}`;
  };

  const calculateTotalSlotsOccupied = () => {
    if (!event || !event.attendees) return 0;
    return event.attendees.reduce((sum, attendee) => sum + (Number(attendee?.number_of_slots) || 1), 0);
  };

  if (!event) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Cycling Event Details</h2>
        <div className="flex items-center gap-2">
          {event.cancellation_status && (
            <span className="inline-block px-3 py-1 text-sm font-medium rounded border bg-red-100 text-red-700 border-red-300">
              Cancelled
            </span>
          )}
          {cashout && (
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(cashout.status)}`}
            >
              Cashout: {cashout.status}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Bike size={20} className="text-green-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{event.title || "Untitled Event"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hosted by {event.host_name || "Unknown Host"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {event.start_landmark?.name || "Unknown Location"}, {event.start_landmark?.state || "Unknown City"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {event.event_date ? formatDate(event.event_date) : "Date TBD"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {event.start_time ? formatTime(event.start_time) : "Time TBD"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Users size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {calculateTotalSlotsOccupied()}/{event.max_attendees || 0} slots
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {event.is_free ? "Free" : `₦${event.price?.toLocaleString() || "0"} per ticket`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            Wallet: ₦{localWalletBalance.toLocaleString() || "0"}
          </span>
        </div>
      </div>
      {event.cancellation_status && !event.is_free && (
        <div className="mt-4 p-4 rounded bg-red-100 dark:bg-red-900">
          <p className="text-red-700 dark:text-red-300">
            This event has been cancelled. Attendees will be contacted for a refund.
          </p>
        </div>
      )}
      {cashout && (
        <div className="mt-4 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <p className="text-yellow-700 dark:text-yellow-300">
            Your cashout request is {cashout.status}. Expected amount: {calculateExpectedAmount()}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mt-4">
        <Button
          onClick={handleCancel}
          className={`bg-red-500 hover:bg-red-600 text-white ${!canCancelEvent() ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canCancelEvent() || loading}
        >
          Cancel Event
        </Button>
      </div>
    </div>
  );
};

export default CyclingDetails;
