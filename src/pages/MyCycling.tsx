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
  attendee_status?: "registered" | "checked_in" | "absent"; // Added for attendee status
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

        // Fetch joined events with confirmation code and status
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
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid, confirmation_code, status),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            ),
            attendee:cycling_attendees!user_joined_cycling_attendee_id_fkey(confirmation_code, status)
          `)
          .eq("user_id", userId);

        if (joinedError) throw joinedError;

        const joined = joinedData
          .map((item: any) => ({
            ...item.cycling_event,
            confirmation_code: item.attendee?.confirmation_code,
            attendee_status: item.attendee?.status, // Add attendee status
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
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const dateStr = format(dateObj, "yyyy-MM-dd");
      const parsedTime = parse(time, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");
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
      const parsedTime = parse(startTime, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");
      const isoDateTime = `${dateStr}T${timeStr}:00Z`;
      const now = DateTime.now().setZone("Africa/Lagos");
      const matchDateTime = DateTime.fromISO(isoDateTime, { zone: "utc" }).setZone("Africa/Lagos");
      const endDateTime = matchDateTime.plus({ hours: 1 });
      if (now < matchDateTime) return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
      if (now.hasSame(matchDateTime, "day") && now < matchDateTime) return { text: "Today", className: "bg-green-100 text-green-700" };
      if (now >= matchDateTime && now <= endDateTime) return { text: "Live", className: "bg-green-100 text-green-800" };
      return { text: "Passed", className: "bg-gray-100 text-gray-800" };
    } catch {
      return { text: "Unknown", className: "bg-gray-100 text-gray-800" };
    }
  };

  const getAttendeeStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "registered":
        return "bg-yellow-500 text-white border-yellow-600";
      case "checked_in":
        return "bg-green-500 text-white border-green-600";
      case "absent":
        return "bg-red-500 text-white border-red-600";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const getAttendeeDisplayStatus = (status: string) => {
    return status.toLowerCase() === "absent" ? "No Show" : 
           status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-green-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold">My Cycling</h1>
            </div>
            <div className="w-10"></div>
          </div>
        </header>
        <div className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 p-4 text-center">
              Please log in to view your cycling events.
            </p>
            <Button
              className="mx-auto block px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              onClick={() => navigate("/login")}
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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">My Cycling</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Card className="w-full bg-white dark:bg-gray-800 border-none shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
                <Bike className="mr-2 h-6 w-6" />
                My Cycling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="hosting" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="hosting"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Hosting
                  </TabsTrigger>
                  <TabsTrigger
                    value="cycling"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
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
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {event.start_landmark.name}, {event.start_landmark.state}
                              </p>
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
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
                              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                Slots: <span className="text-green-600 dark:text-green-400">{event.attendees.length}</span>/{event.max_attendees}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Bike size={16} className="mr-2" />
                                Organized by: {event.host_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                              onClick={() => navigate(`/cycling/${event.slug}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
                      No hosted cycling events found.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="cycling">
                  {joinedEvents.length > 0 ? (
                    joinedEvents.map((event) => {
                      const { dateStr, timeStr } = formatMatchDateTime(event.event_date, event.start_time);
                      const statusLabel = getMatchStatus(event.event_date, event.start_time);
                      const attendeeStatus = event.attendee_status || "registered";
                      return (
                        <div
                          key={event.id_uuid}
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {event.start_landmark.name}, {event.start_landmark.state}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Confirmation Code: {event.confirmation_code || "N/A"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Bike size={16} className="mr-2" />
                                Organized by: {event.host_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2 items-center">
                            <Button
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                              onClick={() => navigate(`/cycling/${event.slug}`)}
                            >
                              View Details
                            </Button>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded border ${getAttendeeStatusStyles(attendeeStatus)}`}
                            >
                              {getAttendeeDisplayStatus(attendeeStatus)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
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
