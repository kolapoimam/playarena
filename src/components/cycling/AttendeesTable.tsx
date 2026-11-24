import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { addHours } from "date-fns";

import { Avatar, Pill, Progress, ScButton, SPORT, initialsOf, sportFor } from "@/components/sc/ui";
type Attendee = {
  id_uuid: string;
  attendee_name: string;
  attendee_phone: string;
  status: "registered" | "checked_in" | "absent";
  confirmation_code: string;
  details: { phone: string } | null;
  number_of_slots?: number;
};

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
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

interface AttendeesTableProps {
  hideActions?: boolean;
  event: CyclingEvent;
  attendees: Attendee[];
  navigate: (path: string) => void;
  isEnded: boolean;
  isStarted: boolean;
  isFull: boolean;
  totalAttendees: number;
}

const formatStatus = (status: string, eventDateTime: Date) => {
  if (status.toLowerCase() === "absent") {
    const now = new Date();
    const twentyFourHoursAfterEvent = addHours(eventDateTime, 24);
    return now >= twentyFourHoursAfterEvent ? "No Show" : "Absent";
  }
  return status.toLowerCase() === "no_show" ? "No Show" : 
         status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "registered":
      return "bg-[#FEF9C3] text-[#A16207] border-transparent";
    case "checked_in":
      return "bg-[#DCFCE7] text-[#15803D] border-transparent";
    case "absent":
    case "no_show":
      return "bg-[#FEE2E2] text-[#B91C1C] border-transparent";
    default:
      return "bg-sc-soft text-sc-ink2 border-transparent";
  }
};

const AttendeesTable: React.FC<AttendeesTableProps> = ({ event, attendees, navigate, isEnded, isStarted, isFull, totalAttendees, hideActions }) => {
  const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
  
  const pct = event.max_attendees ? Math.min(100, (totalAttendees * 100) / event.max_attendees) : 0;
  return (
    <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
      <div className="flex justify-between items-baseline">
        <span className="text-base font-extrabold">Riders</span>
        <span className="text-sm font-bold text-sc-ink2">
          {totalAttendees} of {event.max_attendees}
        </span>
      </div>
      <Progress value={pct} height={10} color={SPORT.cycling.solid} />
      {attendees && attendees.length > 0 ? (
        <div className="divide-y divide-sc-line">
          {attendees.map((attendee) => (
            <div key={attendee.id_uuid} className="flex items-center gap-3 py-2.5">
              <Avatar seed={attendee.attendee_name} initials={initialsOf(attendee.attendee_name)} sport={sportFor(attendee.attendee_name)} size={36} />
              <span className="flex-1 min-w-0 text-[15px] font-bold truncate">
                {attendee.attendee_name}
                {attendee.number_of_slots && attendee.number_of_slots > 1 && (
                  <span className="text-sc-ink3 font-semibold"> +{attendee.number_of_slots - 1}</span>
                )}
              </span>
              <Pill sport="cycling">{formatStatus(attendee.status, eventDateTime)}</Pill>
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sc-ink3 text-sm">No riders have joined yet. Be the first.</p>
      )}
      {!hideActions && (
        <div className="pt-1">
          {isEnded ? (
            <ScButton kind="soft" disabled>Ride completed</ScButton>
          ) : (
            <ScButton kind="cycling" onClick={() => navigate(`/join-cycling/${event.slug}`)} disabled={isFull}>
              {isFull ? "Ride is full" : "Join ride"}
            </ScButton>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendeesTable;
