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
  Bell,
  Flag,
  Route
} from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import CyclingDetailsDialogue from "@/components/cycling/CyclingDetailsDialogue";
import Navbar from "@/components/Navbar";
import AttendeesTable from "@/components/cycling/AttendeesTable";
import { addHours, addMinutes } from "date-fns";
import { DateTime } from "luxon";
import { Seo } from "@/components/Seo";

import { Avatar, BackButton, Bubble, IconButton, Pill, ScButton, SPORT, StickyFooter, formatNaira, initialsOf, Cover } from "@/components/sc/ui";
import { DetailSkeleton } from "@/components/sc/skeletons";
const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

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
    return <DetailSkeleton />;
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
    <>
      <Seo
        title={event ? `${event.title} | Cycling Event | Sport Cliq` : "Cycling Event | Sport Cliq"}
        description={event ? `Details for ${event.title} cycling event on Sport Cliq. Cycling in Nigeria, Bicycle Training in Nigeria, Play Sports Near You, Nigerian cycling, Nigerian sports, Sportstech, Osimhen, Asisat Oshola.` : "View cycling event details on Sport Cliq. Cycling in Nigeria, Bicycle Training in Nigeria, Play Sports Near You, Nigerian cycling, Nigerian sports, Sportstech, Osimhen, Asisat Oshola."}
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
        jsonLd={{
          "@type": "SportsEvent",
          name: event.title,
          sport: "Cycling",
          startDate: event.event_date,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: event.start_landmark?.name, address: { "@type": "PostalAddress", addressRegion: event.start_landmark?.state, addressCountry: "NG" } },
          organizer: { "@type": "Person", name: event.host_name },
          maximumAttendeeCapacity: event.max_attendees,
          offers: { "@type": "Offer", price: event.is_free ? 0 : event.price ?? 0, priceCurrency: "NGN", url: window.location.href },
          url: window.location.href,
        }}
      />
      <div className="min-h-screen pb-36 bg-sc-bg text-sc-ink font-sans">
        <div className="relative h-[300px] overflow-hidden rounded-b-[36px]" style={{ background: SPORT.cycling.bg }}>
          <Cover kind="cycling" />
          <div className="absolute left-5 right-5 flex justify-between" style={{ top: "max(env(safe-area-inset-top), 1rem)" }}>
            <BackButton className="mt-3" />
            <IconButton icon={Bell} label="Add to calendar" onClick={addToCalendar} className="mt-3" />
          </div>
          <span className="absolute left-[30px] bottom-4">
            <Pill sport="ink" icon={Flag}>{event.start_landmark?.name}</Pill>
          </span>
          {event.end_landmark && (
            <span className="absolute right-5 top-[150px]">
              <Pill sport="ink" icon={MapPin}>{event.end_landmark.name}</Pill>
            </span>
          )}
        </div>

        <div className="px-5 pt-[18px] flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="flex gap-1.5 flex-wrap">
              <Pill sport="cycling" icon={Calendar}>{new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</Pill>
              <Pill sport={event.is_free ? "football" : "tennis"}>{event.is_free ? "Free" : formatNaira(event.price)}</Pill>
            </span>
            <h1 className="m-0 text-[30px] leading-[34px] font-extrabold tracking-[-0.03em]">{event.title}</h1>
          </div>

          {isEnded ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold bg-sc-soft2 text-sc-ink2">This ride has passed</div>
          ) : isStarted ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: SPORT.guide.bg, color: SPORT.guide.fg }}>This ride has started</div>
          ) : isFull ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: SPORT.red.bg, color: SPORT.red.fg }}>This ride is completely filled up</div>
          ) : status === "today" ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>This ride is happening today</div>
          ) : null}

          <div className="flex gap-2.5">
            {[
              { icon: Route, sport: "cycling" as const, label: event.duration_type === "distance" ? "Distance" : "Duration", value: `${event.duration_value} ${event.duration_type === "distance" ? "km" : event.duration_type}` },
              { icon: Clock, sport: "guide" as const, label: "Starts", value: formatTime(event.start_time) },
              { icon: Users, sport: "pink" as const, label: "Riders", value: `${attendees.length}/${event.max_attendees}` },
            ].map((f) => (
              <div key={f.label} className="flex-1 min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-1.5">
                <Bubble icon={f.icon} sport={f.sport} size={32} />
                <span className="text-xs text-sc-ink3 font-semibold">{f.label}</span>
                <span className="text-[15px] font-extrabold truncate">{f.value}</span>
              </div>
            ))}
          </div>

          <AttendeesTable
            event={event}
            attendees={attendees}
            navigate={navigate}
            isEnded={isEnded}
            isStarted={isStarted}
            isFull={isFull}
            totalAttendees={attendees.length}
            hideActions
          />

          <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
            <span className="text-base font-extrabold">Route</span>
            <button type="button" onClick={() => navigate(`/landmark/${event.start_landmark.slug}`)} className="flex items-center gap-3 text-left">
              <Bubble icon={Flag} sport="cycling" size={40} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs text-sc-ink3 font-semibold">Start</span>
                <span className="text-[15px] font-bold truncate">
                  {event.start_landmark.name}, {event.start_landmark.state}
                </span>
              </span>
              {event.start_landmark.map_link && (
                <a
                  href={event.start_landmark.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Google Maps"
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 rounded-full bg-sc-soft flex items-center justify-center shrink-0"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </button>
            {event.end_landmark && (
              <button type="button" onClick={() => navigate(`/landmark/${event.end_landmark?.slug}`)} className="flex items-center gap-3 text-left">
                <Bubble icon={MapPin} sport="ink" size={40} />
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-xs text-sc-ink3 font-semibold">Finish</span>
                  <span className="text-[15px] font-bold truncate">
                    {event.end_landmark.name}, {event.end_landmark.state}
                  </span>
                </span>
              </button>
            )}
          </div>

          {(event.is_own_bike || event.is_rental_available) && (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <span className="text-base font-extrabold">Bike</span>
              <div className="flex gap-1.5 flex-wrap">
                {event.is_own_bike && <Pill sport="cycling" icon={Bike}>Bring your own bike</Pill>}
                {event.is_rental_available && <Pill sport="football">Rentals available</Pill>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
            <Avatar seed={event.host_name} initials={initialsOf(event.host_name)} sport="cycling" size={48} />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-xs text-sc-ink3 font-semibold">Hosted by</span>
              <span className="text-base font-extrabold flex items-center gap-1.5 truncate">
                {event.host_name}
                <img src="/green-verified.png" alt="Verified" className="w-4 h-4" />
              </span>
            </span>
          </div>

          {event.notes && (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-2">
              <span className="text-base font-extrabold">Notes</span>
              <p className="m-0 text-sm leading-[22px] text-sc-ink2 whitespace-pre-line">{event.notes}</p>
            </div>
          )}

          <CyclingDetailsDialogue event={event} attendees={attendees} />
        </div>

        <StickyFooter>
          <div className="flex items-center gap-3.5">
            <div className="flex flex-col shrink-0">
              <span className="text-xs text-sc-ink3 font-semibold">Entry</span>
              <span className="text-[22px] font-extrabold tracking-[-0.02em]">{event.is_free ? "Free" : formatNaira(event.price)}</span>
            </div>
            {isEnded ? (
              <ScButton onClick={() => navigate(`/feedback/cycling/${event.slug}`)}>Give feedback</ScButton>
            ) : (
              <ScButton kind="cycling" onClick={() => navigate(`/join-cycling/${event.slug}`)} disabled={isFull || isStarted}>
                {isFull ? "Ride is full" : "Join ride"}
              </ScButton>
            )}
          </div>
        </StickyFooter>
      </div>
    </>
  );
};

export default CyclingDetail;
