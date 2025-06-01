import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_status: string;
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
    attendee_status: string;
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
  isFull: boolean;
  totalAttendees: number;
}

const formatStatus = (status: string) => {
  return status.toLowerCase() === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "registered":
      return "bg-yellow-500 text-white border-yellow-600";
    case "checked_in":
      return "bg-green-500 text-white border-green-600";
    case "no_show":
      return "bg-red-500 text-white border-red-600";
    default:
      return "bg-gray-500 text-white border-gray-600";
  }
};

const AttendeesTable: React.FC<AttendeesTableProps> = ({ event, attendees, navigate, isEnded, isFull, totalAttendees }) => {
  return (
    <div className="border rounded-lg p-4 bg-card shadow-md">
      <h2 className="font-semibold mb-3">Attendees ({totalAttendees}/{event.max_attendees})</h2>
      
      {attendees && attendees.length > 0 ? (
        <div className="space-y-2">
          {attendees.map((attendee, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-playarena-100 flex items-center justify-center">
                  {attendee.attendee_name.charAt(0).toUpperCase()}
                </span>
                <span>{attendee.attendee_name}</span>
              </div>
              <Badge
                className={`${getStatusStyles(attendee.attendee_status)} !hover:bg-transparent !hover:cursor-default`}
              >
                {formatStatus(attendee.attendee_status)}
              </Badge>
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
            onClick={() => navigate(`/feedback?cyclingSlug=${event.slug}`)}
          >
            Give Feedback
          </Button>
        ) : isFull ? (
          <Button 
            className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
            variant="outline"
            disabled
          >
            Event Is Full
          </Button>
        ) : (
          <Button 
            className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
            onClick={() => navigate(`/join-cycling/${event.slug}`)}
          >
            Join This Event
          </Button>
        )}
      </div>
    </div>
  );
};

export default AttendeesTable;
