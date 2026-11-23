import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bike, Calendar, MapPin, Copy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { format, parse } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { DateTime } from "luxon";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
import { ViewTicketButton } from "@/components/sc/TicketCard";
type Landmark = {
  name: string;
  state: string;
};

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  attendees: { id_uuid: string }[];
  start_landmark: Landmark;
  supercode?: string;
  host_name?: string;
  confirmation_code?: string;
};

const MyCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [hostedEvents, setHostedEvents] = useState<CyclingEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CyclingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          setUserId(session.session.user.id);
        } else {
          setUserId(null);
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setUserId(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId === null) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch hosted events
        const { data: hostedData, error: hostedError } = await supabase
          .from("user_hosted_cycling")
          .select(`
            cycling_event:cycling_events(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              max_attendees,
              supercode,
              host_name,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            )
          `)
          .eq("user_id", userId);

        if (hostedError) throw hostedError;

        const hosted = hostedData
          .map((item: any) => item.cycling_event)
          .filter((event: CyclingEvent | null) => event !== null);

        setHostedEvents(hosted);

        // Fetch joined events with confirmation code
        const { data: joinedData, error: joinedError } = await supabase
          .from("user_joined_cycling")
          .select(`
            cycling_event:cycling_events(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              max_attendees,
              host_name,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid, confirmation_code),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            ),
            attendee:cycling_attendees!user_joined_cycling_attendee_id_fkey(confirmation_code)
          `)
          .eq("user_id", userId);

        if (joinedError) throw joinedError;

        const joined = joinedData
          .map((item: any) => ({
            ...item.cycling_event,
            confirmation_code: item.attendee?.confirmation_code,
          }))
          .filter((event: CyclingEvent | null) => event !== null);

        setJoinedEvents(joined);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        toast({
          title: "Error",
          description: err.message || "Failed to load events.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  const formatMatchDateTime = (date: string, time: string) => {
    try {
      // Parse event_date (e.g., '2025-06-20 00:00:00+00') to extract YYYY-MM-DD
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const dateStr = format(dateObj, "yyyy-MM-dd");

      // Parse start_time (e.g., '07:00 AM') to HH:mm format
      const parsedTime = parse(time, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");

      // Combine date and time for UTC parsing
      const isoDateTime = `${dateStr}T${timeStr}:00Z`;
      const zonedDate = utcToZonedTime(new Date(isoDateTime), "Africa/Lagos");
      return {
        dateStr: format(zonedDate, "EEE, dd MMM yyyy"),
        timeStr: format(zonedDate, "h:mm a"),
      };
    } catch (err) {
      console.error("Date/time parsing error:", err);
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
  };

  const getMatchStatus = (matchDate: string, startTime: string) => {
    try {
      const dateObj = new Date(matchDate);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const dateStr = format(dateObj, "yyyy-MM-dd");

      // Parse start_time (e.g., '07:00 AM') to HH:mm
      const parsedTime = parse(startTime, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");

      const isoDateTime = `${dateStr}T${timeStr}:00Z`;
      const now = DateTime.now().setZone("Africa/Lagos");
      const matchDateTime = DateTime.fromISO(isoDateTime, { zone: "utc" }).setZone("Africa/Lagos");
      const endDateTime = matchDateTime.plus({ hours: 1 }); // Assume 1-hour duration

      if (now < matchDateTime) return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
      if (now.hasSame(matchDateTime, "day") && now < matchDateTime) return { text: "Today", className: "bg-sc-green-bg text-sc-green-dark" };
      if (now >= matchDateTime && now <= endDateTime) return { text: "Live", className: "bg-sc-green-bg text-sc-green-dark" };
      return { text: "Passed", className: "bg-sc-soft text-sc-ink" };
    } catch {
      return { text: "Unknown", className: "bg-sc-soft text-sc-ink" };
    }
  };

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">My cycling</h1>
        </header>
        <div className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4 text-center">
              Please log in to view your cycling events.
            </p>
            <Button
              className="mx-auto block px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
              onClick={() => navigate("/auth")}
            >
              Log In
            </Button>
          </div>
        </div>
        <div className="pb-28">
          <Navbar />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">My cycling</h1>
        </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Card className="w-full bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
                <Bike className="mr-2 h-6 w-6" />
                My Cycling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="hosting" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-sc-soft dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="hosting"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Hosting
                  </TabsTrigger>
                  <TabsTrigger
                    value="cycling"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Cycling
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="hosting">
                  {hostedEvents.length > 0 ? (
                    hostedEvents.map((event) => {
                      const { dateStr, timeStr } = formatMatchDateTime(event.event_date, event.start_time);
                      const statusLabel = getMatchStatus(event.event_date, event.start_time);
                      return (
                        <div
                          key={event.id_uuid}
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100">{event.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {event.start_landmark.name}, {event.start_landmark.state}
                              </p>
                              <div className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center gap-2">
                                <span>Super Code:</span>
                                <span className="flex items-center gap-1">
                                  <span>{event.supercode || "N/A"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.writeText(event.supercode || "");
                                      toast({
                                        title: "Success",
                                        description: "Super code copied!",
                                      });
                                    }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Copy size={12} />
                                  </Button>
                                </span>
                              </div>
                              <p className="text-base font-medium text-sc-ink dark:text-gray-100">
                                Slots: <span className="text-sc-green-dark dark:text-green-400">{event.attendees.length}</span>/{event.max_attendees}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Bike size={16} className="mr-2" />
                                Organized by: {event.host_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                              onClick={() => navigate(`/cycling/${event.slug}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                      No hosted cycling events found.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="cycling">
                  {joinedEvents.length > 0 ? (
                    joinedEvents.map((event) => {
                      const { dateStr, timeStr } = formatMatchDateTime(event.event_date, event.start_time);
                      const statusLabel = getMatchStatus(event.event_date, event.start_time);
                      return (
                        <div
                          key={event.id_uuid}
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100">{event.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {event.start_landmark.name}, {event.start_landmark.state}
                              </p>
                              <div className="flex items-center justify-between gap-2 py-1">
                                <span className="text-sm text-sc-ink3">
                                  Code <b className="text-sc-ink tracking-[0.12em]">{event.confirmation_code || "N/A"}</b>
                                </span>
                                <ViewTicketButton
                                  ticket={{
                                    sport: "cycling",
                                    kind: "Ride ticket",
                                    title: event.title,
                                    code: event.confirmation_code,
                                    rows: [
                                      { label: "Date", value: dateStr },
                                      { label: "Starts", value: timeStr },
                                      { label: "Meet at", value: `${event.start_landmark.name}, ${event.start_landmark.state}` },
                                      { label: "Host", value: event.host_name || "SportCliq host" },
                                    ],
                                    footnote: "The host scans this QR code on ride day.",
                                  }}
                                />
                              </div>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Bike size={16} className="mr-2" />
                                Organized by: {event.host_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                              onClick={() => navigate(`/cycling/${event.slug}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                      No joined cycling events found.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MyCycling;
