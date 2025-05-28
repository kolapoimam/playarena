import { format, differenceInMinutes } from "date-fns";
import { Bike, MapPin, Calendar, Clock, Users, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
  event_status: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  attendees: [{ id: string;
    attendee_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type CashoutProps = {
  id: string;
  event_id: string;
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
  handleCancelEvent: () => void;
  loading: boolean;
  isEventPast: boolean;
  walletBalance: number;
};

const CyclingDetails = ({ event, cashout, handleCancelEvent, loading, isEventPast, walletBalance }: CyclingDetailsProps) => {
  const { toast } = useToast();
  const [localWalletBalance, setLocalWalletBalance] = useState<number>(walletBalance);

  useEffect(() => {
    if (!event) {
      setLocalWalletBalance(0);
      return;
    }

    const fetchWalletBalance = async () => {
      try {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from("attendees")
          .select("attendee_status, number_of_slots")
          .eq("event_id", event.id);

        if (attendeesError) throw attendeesError;

        let balance = 0;
        if (event.is_paid && event.price) {
          const checkedInAttendees = attendeesData.filter((a => a.attendee_status === "Checked In"));
          balance = checkedInAttendees.reduce(
            (sum, attendee) => sum + ((attendee.number_of_slots || 1) * (event.price || 0)),
            0
          );
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
      .channel(`attendees_event_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendees',
          filter: `event_id=eq.${event.id}`,
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
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const now = new Date();
    const minutesToStart = differenceInMinutes(eventDateTime, now);
    const hasCheckedInAttendees = event.attendees?.some((a) => a.status === "Checked In") || false;
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
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
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
    if (event.is_paid && event.price) {
      const checkedInAttendees = event.attendees?.filter((a) => a.status === "Checked In") || [];
      total = checkedInAttendees.reduce(
        (sum, attendee) => sum + ((attendee.number_of_slots || 1) * (event.price || 0)),
        0
      );
    }
    return `₦${total.toLocaleString()}`;
  };

  const calculateTotalSlotsOccupied = () => {
    if (!event || !event.attendees) return 0;
    return event.attendees.reduce((sum, attendee) => sum + (attendee.number_of_slots || 1), 0);
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
            {event.location?.name || "Unknown Location"}, {event.location?.city || "Unknown City"}
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
            {event.event_time ? formatTime(event.event_time) : "Time TBD"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Users size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {calculateTotalSlotsOccupied()}/{event.total_slots || 0} slots
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            {event.is_paid ? `₦${event.price?.toLocaleString() || "0"} per ticket` : "Free"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">
            Wallet: ₦{localWalletBalance.toLocaleString() || "0"}
          </span>
        </div>
      </div>
      {event.cancellation_status && event.is_paid && (
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
          onClick={handleCancelEvent}
          className={`bg-red-500 hover:bg-blue-600 text-white ${!canCancelEvent() ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canCancelEvent() || loading}
        >
          Cancel Event
        </Button>
      </div>
    </div>
  );
};

export default CyclingDetails;
