import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Users, MapPin, Copy } from "lucide-react";
import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { DateTime } from "luxon";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

type CyclingEvent = {
  id_uuid: string;
  title: string;
  slug: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  supercode?: string;
  confirmation_code?: string;
  status: string;
  cancellation_status: boolean;
  start_landmark_name?: string;
  start_landmark_state?: string;
  is_free: boolean;
  price?: number;
  max_attendees?: number;
  booked_attendees?: number;
  host_name?: string;
  is_own_bike?: boolean;
  is_rental_bike?: boolean;
};

type Profile = {
  id: string;
  nickname?: string;
  first_name?: string;
};

const MyCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostedEvents, setHostedEvents] = useState<CyclingEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CyclingEvent[]>([]);
  const [cancelEventId, setCancelEventId] = useState<string | null>(null);
  const [cancelIsJoined, setCancelIsJoined] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch profile
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (profileError) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch hosted events
      const { data: hostData, error: hostError } = await supabase
        .from("cycling_events")
        .select(`
          id_uuid,
          title,
          slug,
          event_date,
          start_time,
          end_time,
          supercode,
          status,
          cancellation_status,
          is_free,
          price,
          max_attendees,
          host_name,
          is_own_bike,
          is_rental_available,
          start_landmark:landmarks!start_landmark_id(name, state)
        `)
        .eq("host_phone", profileData.nickname || profileData.first_name || "08118610973") // Fallback to match SQL data
        .order("created_at", { ascending: false })
        .limit(5);

      if (hostError) {
        toast({ title: "Error", description: "Failed to load hosted events.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const hostedEventsWithAttendees = await Promise.all(
        (hostData || []).map(async (item) => {
          const { data: attendees, error: attendeeError } = await supabase
            .from("cycling_attendees")
            .select("id_uuid")
            .eq("cycling_event_id_uuid", item.id_uuid)
            .eq("status", "registered");

          if (attendeeError) {
            toast({ title: "Error", description: "Failed to load attendee count.", variant: "destructive" });
            return { ...item, booked_attendees: 0 };
          }

          return {
            ...item,
            start_landmark_name: item.start_landmark?.name,
            start_landmark_state: item.start_landmark?.state,
            is_rental_bike: item.is_rental_available,
            booked_attendees: attendees.length,
          };
        })
      );

      setHostedEvents(hostedEventsWithAttendees);

      // Fetch joined events
      const { data: joinData, error: joinError } = await supabase
        .from("cycling_attendees")
        .select(`
          id_uuid,
          cycling_event_id_uuid,
          confirmation_code,
          status,
          cycling_events!cycling_event_id_uuid(
            id_uuid,
            title,
            slug,
            event_date,
            start_time,
            end_time,
            status,
            cancellation_status,
            is_free,
            price,
            max_attendees,
            host_name,
            is_own_bike,
            is_rental_available,
            start_landmark:landmarks!start_landmark_id(name, state)
          ),
          is_own_bike,
          is_rental_bike
        `)
        .eq("attendee_phone", profileData.nickname || profileData.first_name || "12312321321") // Fallback to match SQL data
        .order("created_at", { ascending: false })
        .limit(5);

      if (joinError) {
        toast({ title: "Error", description: "Failed to load joined events.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const joinedEventsData = await Promise.all(
        (joinData || []).map(async (item) => {
          const event = item.cycling_events;
          const { data: attendees, error: attendeeError } = await supabase
            .from("cycling_attendees")
            .select("id_uuid")
            .eq("cycling_event_id_uuid", event.id_uuid)
            .eq("status", "registered");

          if (attendeeError) {
            toast({ title: "Error", description: "Failed to load attendee count.", variant: "destructive" });
            return { ...event, booked_attendees: 0 };
          }

          return {
            ...event,
            confirmation_code: item.confirmation_code,
            attendee_status: item.status || "registered",
            attendee_cancellation_status: item.status === "cancelled",
            start_landmark_name: event.start_landmark?.name,
            start_landmark_state: event.start_landmark?.state,
            is_rental_bike: event.is_rental_available,
            booked_attendees: attendees.length,
            is_own_bike: item.is_own_bike,
            is_rental_bike: item.is_rental_bike,
          };
        })
      );

      setJoinedEvents(joinedEventsData);
      setLoading(false);
    };

    fetchData();
  }, [navigate, toast]);

  const canCancelEvent = (eventDate: string, startTime: string) => {
    if (!eventDate || !startTime) return false;
    const now = new Date();
    const eventDateTime = DateTime.fromFormat(
      `${eventDate} ${startTime}`,
      "yyyy-MM-dd hh:mm a",
      { zone: "Africa/Lagos" }
    ).toJSDate();
    if (isNaN(eventDateTime.getTime())) return false;
    const oneHourBefore = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    return now < oneHourBefore;
  };

  const handleCancelConfirm = async () => {
    if (!cancelEventId || !profile) return;

    const now = new Date();
    const { data: event, error: eventError } = await supabase
      .from("cycling_events")
      .select("event_date, start_time, cancellation_status")
      .eq("id_uuid", cancelEventId)
      .single();

    if (eventError || !event || event.cancellation_status) {
      toast({ title: "Error", description: "Cannot cancel event that is already cancelled.", variant: "destructive" });
      setShowCancelDialog(false);
      return;
    }

    const eventDateTime = DateTime.fromFormat(
      `${event.event_date} ${event.start_time}`,
      "yyyy-MM-dd hh:mm a",
      { zone: "Africa/Lagos" }
    ).toJSDate();
    if (eventDateTime <= new Date(now.getTime() + 60 * 60 * 1000)) {
      toast({ title: "Error", description: "Cannot cancel event within 1 hour or in the past.", variant: "destructive" });
      setShowCancelDialog(false);
      return;
    }

    try {
      if (cancelIsJoined) {
        // Cancel participation
        const { error: attendeeError } = await supabase
          .from("cycling_attendees")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("cycling_event_id_uuid", cancelEventId)
          .eq("attendee_phone", profile.nickname || profile.first_name || "12312321321");

        if (attendeeError) throw attendeeError;

        const { data: attendees, error: attendeeFetchError } = await supabase
          .from("cycling_attendees")
          .select("id_uuid")
          .eq("cycling_event_id_uuid", cancelEventId)
          .eq("status", "registered");

        if (attendeeFetchError) throw attendeeFetchError;

        setJoinedEvents((prev) =>
          prev.map((e) =>
            e.id_uuid === cancelEventId
              ? { ...e, attendee_status: "cancelled", attendee_cancellation_status: true, booked_attendees: attendees.length }
              : e
          )
        );
      } else {
        // Cancel entire event
        const { error: eventUpdateError } = await supabase
          .from("cycling_events")
          .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
          .eq("id_uuid", cancelEventId);

        if (eventUpdateError) throw eventUpdateError;

        const { error: attendeesError } = await supabase
          .from("cycling_attendees")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("cycling_event_id_uuid", cancelEventId);

        if (attendeesError) throw attendeesError;

        setHostedEvents((prev) =>
          prev.map((e) =>
            e.id_uuid === cancelEventId ? { ...e, status: "cancelled", cancellation_status: true, booked_attendees: 0 } : e
          )
        );
      }

      toast({ title: "Success", description: cancelIsJoined ? "Participation cancelled successfully!" : "Event cancelled successfully!" });
    } catch (error) {
      console.error("Cancellation error:", error);
      toast({ title: "Error", description: "Failed to cancel. Please try again.", variant: "destructive" });
    } finally {
      setShowCancelDialog(false);
      setCancelEventId(null);
      setCancelIsJoined(false);
    }
  };

  const formatEventDateTime = (date: string, time: string) => {
    if (!date || !time) {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
    try {
      const eventDateTime = DateTime.fromFormat(
        `${date} ${time}`,
        "yyyy-MM-dd hh:mm a",
        { zone: "Africa/Lagos" }
      );
      const dateStr = eventDateTime.toFormat("EEE, dd MMM yyyy");
      const timeStr = eventDateTime.toFormat("h:mm a");
      return { dateStr, timeStr };
    } catch {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
  };

  const getEventStatus = (eventDate: string, startTime: string, endTime: string | null) => {
    const now = DateTime.now().setZone("Africa/Lagos");
    const eventDateTime = DateTime.fromFormat(
      `${eventDate} ${startTime}`,
      "yyyy-MM-dd hh:mm a",
      { zone: "Africa/Lagos" }
    );
    const endDateTime = endTime
      ? DateTime.fromFormat(
          `${eventDate} ${endTime}`,
          "yyyy-MM-dd hh:mm a",
          { zone: "Africa/Lagos" }
        )
      : eventDateTime.plus({ hours: 1 }); // Fallback duration

    if (now < eventDateTime) return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
    if (now.hasSame(eventDateTime, "day") && now < eventDateTime) return { text: "Today", className: "bg-green-100 text-green-700" };
    if (now >= eventDateTime && now <= endDateTime) return { text: "Live", className: "bg-green-100 text-green-800" };
    return { text: "Passed", className: "bg-gray-100 text-gray-800" };
  };

  const getStatusLabel = (status: string, isCancelled: boolean, eventDate: string, startTime: string, endTime: string | null) => {
    if (isCancelled) return { text: "Cancelled", className: "bg-red-100 text-red-800" };
    const eventStatus = getEventStatus(eventDate, startTime, endTime);
    return eventStatus;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
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
                <Users className="mr-2 h-6 w-6" />
                My Cycling Events
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
                    value="joined"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Joined
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="hosting">
                  {hostedEvents.length > 0 ? (
                    hostedEvents.map((event) => {
                      const { dateStr, timeStr } = formatEventDateTime(event.event_date, event.start_time);
                      const statusLabel = getStatusLabel(event.status, event.cancellation_status, event.event_date, event.start_time, event.end_time);
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
                                {event.start_landmark_name ? `${event.start_landmark_name}, ${event.start_landmark_state}` : "Location TBD"}
                              </p>
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span>Supercode:</span>
                                <span className="flex items-center gap-1">
                                  <span>{event.supercode || "N/A"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.writeText(event.supercode || "");
                                      toast({
                                        title: "Success",
                                        description: "Supercode copied!",
                                      });
                                    }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Copy size={12} />
                                  </Button>
                                </span>
                              </div>
                              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                Attendees: <span className="text-green-600 dark:text-green-400">{event.booked_attendees}</span>/{event.max_attendees}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Cost: {event.is_free ? "Free" : `₦${event.price?.toLocaleString()}`}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Bike Options: {event.is_own_bike ? "Own Bike" : ""}{event.is_own_bike && event.is_rental_bike ? ", " : ""}{event.is_rental_bike ? "Rentals Available" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {(event.status === "upcoming" || event.status === "today") && !event.cancellation_status ? (
                              <Button
                                variant="outline"
                                className="px-4 py-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                                onClick={() => {
                                  setCancelEventId(event.id_uuid);
                                  setCancelIsJoined(false);
                                  setShowCancelDialog(true);
                                }}
                                disabled={!canCancelEvent(event.event_date, event.start_time)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                                onClick={() => navigate(`/feedback?cyclingSlug=${event.slug}`)}
                                disabled={
                                  (new Date().getTime() - DateTime.fromFormat(
                                    `${event.event_date} ${event.start_time}`,
                                    "yyyy-MM-dd hh:mm a",
                                    { zone: "Africa/Lagos" }
                                  ).toJSDate().getTime()) / (1000 * 60 * 60) > 48
                                }
                              >
                                Review Feedback
                              </Button>
                            )}
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
                <TabsContent value="joined">
                  {joinedEvents.length > 0 ? (
                    joinedEvents.map((event) => {
                      const { dateStr, timeStr } = formatEventDateTime(event.event_date, event.start_time);
                      const statusLabel = getStatusLabel(event.attendee_status || "registered", event.attendee_cancellation_status || event.cancellation_status, event.event_date, event.start_time, event.end_time);
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
                                {event.start_landmark_name ? `${event.start_landmark_name}, ${event.start_landmark_state}` : "Location TBD"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Confirmation Code: {event.confirmation_code || "N/A"}
                              </p>
                              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                Attendees: <span className="text-green-600 dark:text-green-400">{event.booked_attendees}</span>/{event.max_attendees}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Cost: {event.is_free ? "Free" : `₦${event.price?.toLocaleString()}`}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Your Bike Choice: {event.is_own_bike ? "Own Bike" : event.is_rental_bike ? "Rental Bike" : "N/A"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                Hosted by: {event.host_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {(event.status === "upcoming" || event.status === "today") &&
                            !event.cancellation_status &&
                            !event.attendee_cancellation_status ? (
                              <Button
                                variant="outline"
                                className="px-4 py-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                                onClick={() => {
                                  setCancelEventId(event.id_uuid);
                                  setCancelIsJoined(true);
                                  setShowCancelDialog(true);
                                }}
                                disabled={!canCancelEvent(event.event_date, event.start_time)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                                onClick={() => navigate(`/feedback?cyclingSlug=${event.slug}`)}
                                disabled={
                                  (new Date().getTime() - DateTime.fromFormat(
                                    `${event.event_date} ${event.start_time}`,
                                    "yyyy-MM-dd hh:mm a",
                                    { zone: "Africa/Lagos" }
                                  ).toJSDate().getTime()) / (1000 * 60 * 60) > 48
                                }
                              >
                                Give Feedback
                              </Button>
                            )}
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
                      No joined cycling events found.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel {cancelIsJoined ? "your participation in" : "this cycling event"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between mt-4">
            <Button
              variant="outline"
              className="w-1/2 px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setShowCancelDialog(false)}
            >
              No, Go Back
            </Button>
            <Button
              className="w-1/2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              onClick={handleCancelConfirm}
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MyCycling;
