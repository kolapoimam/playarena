import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

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
  event: CyclingEvent;
  attendees: Attendee[];
  navigate: (path: string) => void;
  isEnded: boolean;
  isStarted: boolean;
  isFull: boolean;
  totalAttendees: number;
}

const formatStatus = (status: string) => {
  if (status.toLowerCase() === "absent") return "No Show";
  return status.toLowerCase() === "no_show" ? "No Show" : 
         status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "registered":
      return "bg-yellow-500 text-white border-yellow-200";
    case "checked_in":
      return "bg-green-500 text-white border-green-200";
    case "absent":
    case "no_show":
      return "bg-red-500 text-white border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const AttendeesTable: React.FC<AttendeesTableProps> = ({ event, attendees, navigate, isEnded, isStarted, isFull, totalAttendees }) => {
  return (
    <div className="border rounded-lg p-4 bg-card shadow-md">
      <h2 className="font-semibold mb-3">Attendees ({totalAttendees}/{event.max_attendees})</h2>
      
      {attendees && attendees.length > 0 ? (
        <div className="space-y-4">
          {attendees.map((attendee) => (
            <div
              key={attendee.id_uuid}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {attendee.attendee_name}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`inline-block px-2 py-1 text-sm font-medium rounded border ${getStatusStyles(attendee.status)}`}
                  >
                    {formatStatus(attendee.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No attendees have joined yet</p>
      )}
      
      <div className="mt-6">
        {isEnded ? (
          <Button 
            className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
            onClick={() => navigate(`/feedback/cycling/${event.slug}`)}
          >
            Give Feedback
          </Button>
        ) : (
          <Button 
            className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
            onClick={() => navigate(`/join-cycling/${event.slug}`)}
            disabled={isFull || isStarted}
          >
            {isFull ? "Event Full" : "Join This Event"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AttendeesTable;
