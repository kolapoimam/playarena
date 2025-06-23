import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  ExternalLink, 
  Bike, 
  Bell 
} from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import CyclingDetailsDialogue from "@/components/CyclingDetailsDialogue";
import Navbar from "@/components/Navbar";
import AttendeesTable from "@/components/AttendeesTable";
import { addHours, addMinutes } from "date-fns";
import { DateTime } from "luxon";

type Landmark = {
  name: string;
  state: string;
  description: string;
  map_link: string;
  slug: string;
};

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_phone: string;
  status: "registered" | "checked_in" | "absent";
  cycling_event_id: string;
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
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

const CyclingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<CyclingEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            *,
            start_landmark:landmarks!start_landmark_id(name, state, description, map_link, slug),
            end_landmark:landmarks!end_landmark_id(name, state, description, map_link, slug)
          `)
          .eq("slug", slug)
          .single();

        if (error) throw error;
        setEvent(data);

        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("*")
          .eq("cycling_event_id_uuid", data.id_uuid);

        if (attendeesError) throw attendeesError;
        setAttendees(attendeesData || []);
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching event:", error);
        toast({
          title: "Error",
          description: "Failed to load event details.",
          variant: "destructive",
        });
        navigate("/cycling");
      }
    };
    fetchEvent();
  }, [slug, navigate, toast]);

  useEffect(() => {
    if (!event || !attendees.length) return;

    const updateAbsentAttendees = async () => {
      const now = new Date();
      const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
      const durationInMs = event.duration_type === "hours"
        ? event.duration_value * 60 * 60 * 1000
        : event.duration_value * 60 * 1000;
      const eventEndTime = new Date(eventDateTime.getTime() + durationInMs);
      const thirtyMinutesAfterStart = addMinutes(eventDateTime, 30);

      if (now >= thirtyMinutesAfterStart) {
        try {
          const { error } = await supabase
            .from("cycling_attendees")
            .update({ status: "absent" })
            .eq("cycling_event_id_uuid", event.id_uuid)
            .neq("status", "checked_in");

          if (error) {
            console.error("Error updating attendee status:", error);
            return;
          }

          const { data: updatedAttendees, error: fetchError } = await supabase
            .from("cycling_attendees")
            .select("*")
            .eq("cycling_event_id_uuid", event.id_uuid);

          if (!fetchError) {
            setAttendees(updatedAttendees || []);
          }
        } catch (error) {
          console.error("Error updating attendee status:", error);
        }
      }
    };

    updateAbsentAttendees();
  }, [event, attendees]);

  const getEventStatus = () => {
    if (!event) return { status: "upcoming", isStarted: false, isEnded: false, isFull: false };

    const now = DateTime.now().setZone("Africa/Lagos");
    const eventDateTime = DateTime.fromISO(event.event_date, { zone: "utc" })
      .setZone("Africa/Lagos")
      .set({
        hour: DateTime.fromFormat(event.start_time, "hh:mm a", { zone: "Africa/Lagos" }).hour,
        minute: DateTime.fromFormat(event.start_time, "hh:mm a", { zone: "Africa/Lagos" }).minute,
      });

    const durationInMs = event.duration_type === "hours" 
      ? event.duration_value * 60 * 60 * 1000 
      : event.duration_value * 60 * 1000;
    const eventEndTime = eventDateTime.plus({ milliseconds: durationInMs });
    const thirtyMinutesAfterStart = eventDateTime.plus({ minutes: 30 });

    const today = now.startOf("day");
    const eventDate = eventDateTime.startOf("day");

    let status = "upcoming";
    if (eventDate.toISODate() === today.toISODate()) status = "today";
    else if (eventDate < today) status = "ended";

    const isFull = attendees.length >= event.max_attendees;
    const isStarted = now >= eventDateTime && now < thirtyMinutesAfterStart;
    const isEnded = now >= thirtyMinutesAfterStart || eventDate < today;

    return { status, isEnded, isStarted, isFull };
  };

  const handleShare = () => {
    const url = `${window.location.origin}/cycling-event/${slug}`;
    if (navigator.share) {
      navigator
        .share({
          title: event?.title,
          text: `Join my cycling event: ${event?.title} at ${event?.start_landmark.name}!`,
          url,
        })
        .catch(() =>
          toast({ title: "Error", description: "Failed to share event." })
        );
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard.",
      });
    }
  };

  const addToCalendar = () => {
    if (!event) return;

    const eventDateTime = DateTime.fromISO(event.event_date, { zone: "utc" })
      .setZone("Africa/Lagos")
      .set({
        hour: DateTime.fromFormat(event.start_time, "hh:mm a", { zone: "Africa/Lagos" }).hour,
        minute: DateTime.fromFormat(event.start_time, "hh:mm a", { zone: "Africa/Lagos" }).minute,
      });

    const durationInMs = event.duration_type === "hours" 
      ? event.duration_value * 60 * 60 * 1000 
      : event.duration_value * 60 * 1000;
    const endDateTime = eventDateTime.plus({ milliseconds: durationInMs });

    const formatGoogleDate = (date: DateTime) => {
      const pad = (num: number) => num.toString().padStart(2, "0");
      return `${date.year}${pad(date.month)}${pad(date.day)}T${pad(date.hour)}${pad(date.minute)}${pad(date.second)}`;
    };
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`Sport Cliq: ${event.title}`)}` +
      `&dates=${formatGoogleDate(eventDateTime)}/${formatGoogleDate(endDateTime)}` +
      `&location=${encodeURIComponent(`${event.start_landmark.name}, ${event.start_landmark.state}`)}` +
      `&details=${encodeURIComponent(
        `Cycling Event hosted by ${event.host_name}.\n\n` +
        `Event link: ${window.location.origin}/cycling-event/${event.slug}\n\n` +
        `Start: ${event.start_landmark.name}, ${event.start_landmark.state}\n` +
        `${event.end_landmark ? `End: ${event.end_landmark.name}, ${event.end_landmark.state}\n` : ""}` +
        `Notes: ${event.notes || "No additional information provided"}\n\n` +
        `Powered by @SportCliq`
      )}` +
      `&sf=true&output=xml`;

    window.open(googleCalendarUrl, "_blank", "width=600,height=600");
    setTimeout(() => navigate(`/cycling-event/${slug}`), 1000);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const time = DateTime.fromFormat(timeString, "hh:mm a", { zone: "Africa/Lagos" });
    return time.isValid ? time.toFormat("hh:mm a") : "Invalid Time";
  };

  if (loading) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Fetching event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">The event doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const { status, isStarted, isEnded, isFull } = getEventStatus();

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Event Details</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Hosted by {event.host_name}</p>
            <img 
              src="/green-verified.png"
              alt="Verified"
              className="inline-block w-5 h-5"
            />
          </div>
        </div>

        {isEnded ? (
          <div className="bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded mb-4">
            This event has passed
          </div>
        ) : isStarted ? (
          <div className="bg-blue-100 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            This event has started!
          </div>
        ) : isFull ? (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            This event is completely filled up!
          </div>
        ) : status === "today" ? (
          <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            This event is happening today!
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card shadow-md relative">
            <div className="absolute top-4 right-4 m-0 p-0">
              <Button
                variant="outline"
                size="sm"
                onClick={addToCalendar}
                className="text-blue-600 p-2 border-blue-300 hover:bg-blue-50 m-0"
              >
                <Bell size={16} className="m-0" />
              </Button>
            </div>
            <h2 className="font-semibold mb-3">Event Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>{formatTime(event.start_time)}</span>
              </div>
              <div className="flex items-start gap-2 cursor-pointer" 
                onClick={() => navigate(`/landmark/${event.start_landmark.slug}`)}>
                <MapPin size={18} className="mt-0.5" />
                <div>
                  <span className="text-green-600 hover:underline">
                    {event.start_landmark.name}, {event.start_landmark.state}
                  </span>
                  {event.start_landmark.map_link && (
                    <div className="mt-1">
                      <a 
                        href={event.start_landmark.map_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs flex items-center text-green-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} className="mr-1" />
                        Link to Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>
                  Duration: {event.duration_value} {event.duration_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>
                  {attendees.length}/{event.max_attendees} spots filled
                  {isFull && " (FULL)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bike size={18} />
                <span>
                  {event.is_own_bike && "Bring Your Own Bike"}
                  {event.is_own_bike && event.is_rental_available && " | "}
                  {event.is_rental_available && "Rentals Available"}
                </span>
              </div>
              <div className="font-semibold mt-2">
                Cost: {event.is_free ? "Free" : `₦${event.price?.toFixed(2)}`}
              </div>
              {event.notes && (
                <div className="mt-3">
                  <h3 className="text-sm font-medium mb-1">Notes:</h3>
                  <p className="text-sm bg-muted p-2 rounded">{event.notes}</p>
                </div>
              )}
            </div>
          </div>

          <AttendeesTable
            event={event}
            attendees={attendees}
            navigate={navigate}
            isEnded={isEnded}
            isStarted={isStarted}
            isFull={isFull}
            totalAttendees={attendees.length}
          />

          <CyclingDetailsDialogue event={event} attendees={attendees} />
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default CyclingDetail;
