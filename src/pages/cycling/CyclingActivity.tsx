import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rideWindow } from "@/lib/activityTime";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Filter, ChevronLeft, ChevronRight, ArrowLeft, Flag, Plus, Bike } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { DateTime } from "luxon";

import { BackButton, Cover, DateBox, FunEmpty, Meta, Pill, Progress, SPORT, formatNaira } from "@/components/sc/ui";
import { StateScope, useUserState } from "@/components/sc/location";
import { sameState } from "@/lib/location";
import { EventListSkeleton } from "@/components/sc/skeletons";
interface CyclingEvent {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price: number | null;
  host_name: string;
  host_id: string;
  start_landmark: { id_uuid: string; name: string; state: string; slug: string } | null;
  cycling_attendees: { id_uuid: string; attendee_name: string; status: "registered" | "checked_in" | "absent"; number_of_slots?: number }[];
  status: string;
}

type Landmark = {
  id_uuid: string;
  name: string;
  slug: string;
};

const CyclingActivity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<CyclingEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CyclingEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [isPaidFilter, setIsPaidFilter] = useState<boolean | null>(null);
  const [landmarkFilter, setLandmarkFilter] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const eventsPerPage = 4;
  const LAGOS_TIMEZONE = "Africa/Lagos";

  const userState = useUserState();
  const [stateOnly, setStateOnly] = useState(true);
  const activeState = stateOnly ? userState : null;

  useEffect(() => {
    fetchLandmarks();
    fetchEvents();
  }, [currentPage, isPaidFilter, landmarkFilter, durationFilter, statusFilter, activeState]);

  const fetchLandmarks = async () => {
    try {
      const { data, error } = await supabase
        .from("landmarks")
        .select("id_uuid, name, slug")
        .order("name", { ascending: true });
      if (error) throw error;
      setLandmarks(data as Landmark[]);
    } catch (error: any) {
      console.error("Error fetching landmarks:", error);
      toast({
        title: "Error",
        description: "Failed to load landmarks for filter.",
        variant: "destructive",
      });
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("cycling_events")
        .select(
          `
          id_uuid, slug, title, event_date, start_time, end_time, duration_type, duration_value, max_attendees, is_free, price, host_name, host_id, status, cancellation_status,
          start_landmark:landmarks!start_landmark_id(id_uuid, name, state, slug),
          attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid, attendee_name, status, number_of_slots)
        `,
          { count: "exact" }
        );

      if (isPaidFilter !== null) {
        query = query.eq("is_free", !isPaidFilter);
      }
      if (landmarkFilter) {
        query = query.eq("start_landmark_id", landmarkFilter);
      }
      if (durationFilter !== "all") {
        query = query.eq("duration_type", durationFilter);
      }

      // Fetch all events to sort them client-side
      const { data, error, count } = await query;

      if (error) throw error;

      // Process the data to match the CyclingEvent interface
      const processedEvents = (data || []).map(event => ({
        ...event,
        start_landmark: event.start_landmark || null,
        cycling_attendees: event.attendees || []
      })) as CyclingEvent[];

      // Status comes from the ride's date, start and length, or its cancellation, so the
      // status filter, the labels and the counts always agree
      const now = DateTime.now().setZone(LAGOS_TIMEZONE);
      const today = now.startOf("day");
      const tomorrow = today.plus({ days: 1 });
      const dayAfterTomorrow = tomorrow.plus({ days: 1 });

      const withStatus = processedEvents.map((event: any) => {
        const win = rideWindow(event);
        const start = DateTime.fromJSDate(win.start).setZone(LAGOS_TIMEZONE);
        let status: string;
        if (event.cancellation_status) status = "cancelled";
        else if (now.toMillis() >= win.end.getTime()) status = "passed";
        else if (now.toMillis() >= win.start.getTime()) status = "live";
        else if (start >= today && start < tomorrow) status = "today";
        else if (start >= tomorrow && start < dayAfterTomorrow) status = "tomorrow";
        else status = "upcoming";
        return { ...event, status, _start: win.start.getTime() };
      });

      const statusOrder: Record<string, number> = { live: 0, today: 1, tomorrow: 2, upcoming: 3, passed: 4, cancelled: 5 };
      const sortedEvents = withStatus
        .filter((e) => {
          if (!statusFilter) return true;
          if (statusFilter === "upcoming") return ["live", "today", "tomorrow", "upcoming"].includes(e.status);
          if (statusFilter === "today") return e.status === "today" || e.status === "live";
          return e.status === statusFilter;
        })
        .sort((a, b) => {
          if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
          return a.status === "passed" || a.status === "cancelled" ? b._start - a._start : a._start - b._start;
        }) as CyclingEvent[];

      // Apply pagination client-side
      const stateEvents = activeState ? sortedEvents.filter((e) => sameState(e.start_landmark?.state, activeState)) : sortedEvents;
      const totalPages = Math.max(1, Math.ceil(stateEvents.length / eventsPerPage));
      const page = Math.min(currentPage, totalPages);
      if (page !== currentPage) setCurrentPage(page);
      const paginatedEvents = stateEvents.slice((page - 1) * eventsPerPage, page * eventsPerPage);

      setEvents(paginatedEvents);
      setFilteredEvents(paginatedEvents);
      setTotalEvents(stateEvents.length);
    } catch (error: any) {
      console.error("Error fetching cycling events:", error);
      setEvents([]);
      setFilteredEvents([]);
      setTotalEvents(0);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: CyclingEvent) => {
    if (event.status === "live") return { statusLabel: "Live", statusClass: "bg-red-100 text-red-700" };
    if (event.status === "cancelled") return { statusLabel: "Cancelled", statusClass: "bg-red-100 text-red-700" };
    if (event.status === "today") return { statusLabel: "Today", statusClass: "bg-sc-green-bg text-sc-green-dark" };
    if (event.status === "tomorrow") return { statusLabel: "Tomorrow", statusClass: "bg-yellow-100 text-yellow-700" };
    if (event.status === "upcoming") return { statusLabel: "Upcoming", statusClass: "bg-blue-100 text-blue-800" };
    return { statusLabel: "Passed", statusClass: "bg-sc-soft2 text-sc-ink3" };
  };

  const formatDate = (dateString: string) => {
    const date = DateTime.fromISO(dateString, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return date.isValid ? date.toFormat("ccc, d LLL yyyy") : "Invalid Date";
  };

  const formatTime = (timeString: string) => {
    const time = DateTime.fromFormat(timeString, "hh:mm a", { zone: LAGOS_TIMEZONE });
    return time.isValid ? time.toFormat("hh:mm a") : "Invalid Time";
  };

  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const resetFilters = () => {
    setIsPaidFilter(null);
    setLandmarkFilter(null);
    setDurationFilter("all");
    setStatusFilter(null);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen pb-32 bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"><Button className="h-11 px-4 rounded-full bg-sport-cycling text-white font-bold text-sm hover:brightness-95" onClick={() => navigate("/host-cycling")}>
            <Plus size={18} /> Host ride
          </Button></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Cycling</h1>
        </header>
      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={() => navigate("/landmarks")}
          className="w-full relative overflow-hidden rounded-[28px] p-5 flex flex-col gap-2 text-left text-white"
          style={{ background: SPORT.cycling.solid }}
        >
          <Bike aria-hidden="true" className="absolute opacity-25" size={170} strokeWidth={1.2} style={{ right: -30, bottom: -40 }} />
          <span className="text-[13px] font-extrabold tracking-[0.06em]">START POINTS</span>
          <span className="relative text-[22px] leading-7 font-extrabold tracking-[-0.02em] max-w-[230px]">Browse landmarks and routes</span>
          <span className="relative self-start mt-1 h-10 px-4 rounded-full bg-white text-sport-cycling-fg text-sm font-extrabold flex items-center">Open landmarks</span>
        </button>
      </div>

      <div className="px-5 pt-4">
        <StateScope nearMe={stateOnly} onChange={(v) => { setStateOnly(v); setCurrentPage(1); }} />
      </div>
      <div className="mt-3 px-5">
        <Collapsible
          open={isFilterOpen}
          onOpenChange={setFilterOpen}
          className="mb-4"
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter size={16} className="mr-2" />
              {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 p-4 rounded-3xl bg-white dark:bg-gray-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="is-paid-filter">Payment Type</Label>
                <Select
                  value={isPaidFilter === null ? "all" : isPaidFilter ? "paid" : "free"}
                  onValueChange={(value) => {
                    setIsPaidFilter(value === "all" ? null : value === "paid");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="is-paid-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="landmark-filter">Meeting Point</Label>
                <Select
                  value={landmarkFilter || "all"}
                  onValueChange={(value) => {
                    setLandmarkFilter(value === "all" ? null : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="landmark-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select a landmark" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Landmarks</SelectItem>
                    {landmarks.map((landmark) => (
                      <SelectItem key={landmark.id_uuid} value={landmark.id_uuid}>
                        {landmark.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration-filter">Duration Type</Label>
                <Select
                  value={durationFilter}
                  onValueChange={(value) => {
                    setDurationFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="duration-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select duration type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="kilometer">Kilometer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? null : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="status-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {loading ? (
          <EventListSkeleton label="Loading rides" />
        ) : filteredEvents.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {filteredEvents.map((event) => {
              const { statusLabel, statusClass } = getEventStatus(event);
              const isPast = event.status === "passed";
              const totalAttendeeSlots = event.cycling_attendees?.reduce((sum, attendee) => sum + (attendee.number_of_slots || 1), 0) || 0;
              return (
                <div key={event.id_uuid} className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5 overflow-hidden">
                  <div className="relative -mx-[18px] -mt-[18px] h-[120px] overflow-hidden">
                    <Cover kind="cycling" />
                  </div>
                  <div className="flex gap-3.5 items-center">
                    <DateBox date={event.event_date} sport="cycling" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-[17px] font-extrabold tracking-[-0.02em] truncate">{event.title}</span>
                      <span className="text-[13px] text-sc-ink3">
                        {event.status === "today" ? "Today" : event.status === "tomorrow" ? "Tomorrow" : formatDate(event.event_date)} · {formatTime(event.start_time)}
                      </span>
                    </div>
                  </div>
                  {event.start_landmark && (
                    <button type="button" className="text-left" onClick={() => navigate(`/landmark/${event.start_landmark.slug}`)}>
                      <Meta icon={Flag}>
                        {event.start_landmark.name}, {event.start_landmark.state}
                      </Meta>
                    </button>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-sc-ink3 font-semibold">Riders</span>
                      <span className="font-extrabold">
                        {totalAttendeeSlots}/{event.max_attendees}
                      </span>
                    </div>
                    <Progress value={event.max_attendees ? (totalAttendeeSlots * 100) / event.max_attendees : 0} color={SPORT.cycling.solid} />
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="flex gap-1.5 flex-wrap">
                      <Pill sport={statusLabel === "Passed" ? "gray" : statusLabel === "Today" ? "football" : "guide"}>{statusLabel}</Pill>
                      <Pill sport={event.is_free ? "football" : "tennis"}>{event.is_free ? "Free" : formatNaira(event.price || 0)}</Pill>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/cycling/${event.slug}`)}
                      className="h-10 px-4 rounded-full text-white text-sm font-extrabold flex items-center gap-1 shrink-0"
                      style={{ background: SPORT.cycling.solid }}
                    >
                      View <ChevronRight size={16} />
                    </button>
                  </div>
                  <span className="text-xs text-sc-ink3 font-semibold">Hosted by {event.host_name}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={handlePreviousPage}
              >
                <ChevronLeft size={16} className="mr-2" />
                Previous
              </Button>
              <span className="text-sc-ink2 dark:text-gray-200">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={handleNextPage}
              >
                Next
                <ChevronRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <FunEmpty
            icon={Bike}
            sport="cycling"
            title={activeState ? `No rides in ${activeState} yet` : "The road is quiet"}
            body={activeState ? "Be the one who gets the wheels turning. Host a ride and your crew will find you." : "No rides match your filters right now. Host one and set the pace."}
            primary={{ label: "Host a ride", onClick: () => navigate("/host-cycling") }}
            secondary={activeState ? { label: "See rides across Nigeria", onClick: () => setStateOnly(false) } : undefined}
          />
        )}
        <Navbar />
      </div>
    </div>
  );
};

export default CyclingActivity;
