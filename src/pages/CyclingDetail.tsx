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
  Bicycle, 
  Bell 
} from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import CyclingDetailsDialogue from "@/components/CyclingDetailsDialogue";
import Navbar from "@/components/Navbar";
import AttendeesTable from "@/components/AttendeesTable";
import { addHours } from "date-fns";

type Landmark = {
  name: string;
  state: string;
  description: string;
  map_link: string;
};

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_phone: string;
  attendee_status: string;
  cycling_event_id: string;
};

type CyclingEvent = {
  id: string;
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  duration_value: number;
  duration_type: string;
  max_attendees: number;
  is_free: boolean;
  price?: number;
  host_name: string;
  host_phone: string;
  notes?: string;
  is_own_bike: boolean;
  is_rental_available: boolean;
  start_landmark: Landmark;
  end_landmark?: Landmark;
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
            start_landmark:landmarks!start_landmark_id(name, state, description, map_link),
            end_landmark:landmarks!end_landmark_id(name, state, description, map_link)
          `)
          .eq("slug", slug)
          .single();

        if (error) throw error;
        setEvent(data);

        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("*")
          .eq("cycling_event_id_uuid", data.id_uuid);

        if (!attendeesError) setAttendees(attendeesData || []);
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

  const getEventStatus = () => {
    if (!event) return { status: "upcoming", isStarted: false, isEnded: false, isFull: false };

    const now = new Date();
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const durationInMs = event.duration_type === "hours" 
      ? event.duration_value * 60 * 60 * 1000 
      : event.duration_value * 60 * 1000;
    const eventEndTime = new Date(eventDateTime.getTime() + durationInMs);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const eventDate = new Date(event.event_date);

    let status = "upcoming";
    if (eventDate.toDateString() === today.toDateString()) status = "today";
    else if (eventDate.toDateString() === tomorrow.toDateString()) status = "tomorrow";
    else if (eventDate < today) status = "passed";

    const isFull = attendees.length >= event.max_attendees;
    const isStarted = now >= eventDateTime && now < eventEndTime;
    const isEnded = now >= eventEndTime;

    return { status, isStarted, isEnded, isFull };
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

    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const durationInMs = event.duration_type === "hours" 
      ? event.duration_value * 60 * 60 * 1000 
      : event.duration_value * 60 * 1000;
    const endDateTime = new Date(eventDateTime.getTime() + durationInMs);

    const formatGoogleDate = (date: Date) => {
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`Sport Cliq: ${event.title}`)}` +
      `&dates=${formatGoogleDate(eventDateTime)}/${formatGoogleDate(endDateTime)}` +
      `&location=${encodeURIComponent(`${event.start_landmark.name}, ${event.start_landmark.state}`)}` +
      `&details=${encodeURIComponent(
        `Cycling Event hosted by ${event.host_name}.\n\n` +
        `Event Link: ${window.location.origin}/cycling-event/${event.slug}\n\n` +
        `Start: ${event.start_landmark.name}, ${event.start_landmark.state}\n` +
        `${event.end_landmark ? `End: ${event.end_landmark.name}, ${event.end_landmark.state}\n` : ''}` +
        `Notes: ${event.notes || 'No additional information provided'}\n\n` +
        `Powered by @SportCliq`
      )}` +
      `&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank', 'width=600,height=600');
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
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
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
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
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
          <div className="bg-playarena-100 border border-playarena-200 text-playarena-700 px-4 py-3 rounded mb-4">
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
        ) : status === "tomorrow" ? (
          <div className="bg-blue-100 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            This event is happening tomorrow!
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card shadow-md relative">
            <div className="absolute top-4 right-4 m-0 p-0">
              <Button
                variant="outline"
                size="sm"
                onClick={addToCalendar}
                className="text-playarena-600 border-playarena-300 hover:bg-playarena-50 p-2 m-0"
              >
                <Bell size={16} className="mr-0" />
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
              <div className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5" />
                <div>
                  <span className="text-playarena-600">
                    {event.start_landmark.name}, {event.start_landmark.state}
                  </span>
                  {event.start_landmark.map_link && (
                    <div className="mt-1">
                      <a
                        href={event.start_landmark.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center text-playarena-600 hover:underline"
                      >
                        <ExternalLink size={12} className="mr-1" />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {event.end_landmark && (
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="mt-0.5" />
                  <div>
                    <span className="text-playarena-600">
                      {event.end_landmark.name}, {event.end_landmark.state}
                    </span>
                    {event.end_landmark.map_link && (
                      <div className="mt-1">
                        <a
                          href={event.end_landmark.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center text-playarena-600 hover:underline"
                        >
                          <ExternalLink size={12} className="mr-1" />
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                <Bicycle size={18} />
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
            isFull={isFull}
            totalAttendees={attendees.length}
          />

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={handleShare}
              className="bg-green-500 hover:bg-green-600 text-white flex-1"
            >
              Share
            </Button>
            {!isEnded && attendees.length < event.max_attendees && (
              <Button
                onClick={() => navigate(`/join-cycling/${event.slug}`)}
                className="bg-playarena-500 hover:bg-playarena-600 text-white flex-1"
              >
                Join Event
              </Button>
            )}
          </div>

          <CyclingDetailsDialogue event={event} attendees={attendees} />
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default CyclingDetail;
