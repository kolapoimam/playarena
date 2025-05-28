import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Filter, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { DateTime } from "luxon";

interface CyclingEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price: number | null;
  host_name: string;
  host_id: string;
  start_landmark: { id: string; name: string; state: string } | null;
  attendees: { id: string }[];
  status: string;
}

type Landmark = {
  id: string;
  name: string;
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

  const eventsPerPage = 6;
  const LAGOS_TIMEZONE = "Africa/Lagos";

  useEffect(() => {
    fetchLandmarks();
    fetchEvents();
  }, [currentPage, isPaidFilter, landmarkFilter, durationFilter, statusFilter]);

  const fetchLandmarks = async () => {
    try {
      const { data, error } = await supabase
        .from("landmarks")
        .select("id, name")
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
            id, slug, title, event_date, start_time, max_attendees, is_free, price, host_name, host_id,
            start_landmark:landmarks(id, name, state),
            attendees(id)
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
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const start = (currentPage - 1) * eventsPerPage;
      const end = start + eventsPerPage - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      const now = DateTime.now().setZone(LAGOS_TIMEZONE);
      const today = now.startOf("day");
      const tomorrow = today.plus({ days: 1 });
      const dayAfterTomorrow = tomorrow.plus({ days: 1 });

      const sortedEvents = (data as CyclingEvent[]).map((event) => {
        const eventDateTime = DateTime.fromFormat(
          `${event.event_date} ${event.start_time}`,
          "yyyy-MM-dd hh:mm a"
        ).setZone(LAGOS_TIMEZONE);
        let status;
        if (eventDateTime < now) {
          status = "passed";
        } else if (eventDateTime >= today && eventDateTime < tomorrow) {
          status = "today";
        } else if (eventDateTime >= tomorrow && eventDateTime < dayAfterTomorrow) {
          status = "tomorrow";
        } else {
          status = "upcoming";
        }
        return { ...event, status };
      }).sort((a, b) => {
        const statusOrder = {
          today: 0,
          tomorrow: 1,
          upcoming: 2,
          passed: 3,
        };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        const aDateTime = DateTime.fromFormat(
          `${a.event_date} ${a.start_time}`,
          "yyyy-MM-dd hh:mm a"
        ).setZone(LAGOS_TIMEZONE);
        const bDateTime = DateTime.fromFormat(
          `${b.event_date} ${b.start_time}`,
          "yyyy-MM-dd hh:mm a"
        ).setZone(LAGOS_TIMEZONE);
        return aDateTime.toMillis() - bDateTime.toMillis();
      });

      setEvents(sortedEvents);
      setFilteredEvents(sortedEvents);
      setTotalEvents(count || 0);
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
    if (event.status === "today") return { statusLabel: "Today", statusClass: "bg-green-100 text-green-700" };
    if (event.status === "tomorrow") return { statusLabel: "Tomorrow", statusClass: "bg-yellow-100 text-yellow-700" };
    if (event.status === "upcoming") return { statusLabel: "Upcoming", statusClass: "bg-blue-100 text-blue-800" };
    return { statusLabel: "Passed", statusClass: "bg-gray-200 text-gray-600" };
  };

  const formatDate = (dateString: string) => {
    const date = DateTime.fromISO(dateString, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return date.toFormat("ccc, d LLL yyyy");
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
    <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-green-500 to-green-700 text-white p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Cycling Events</h1>
          </div>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={() => navigate("/host-cycling")}
          >
            Host Event
          </Button>
        </div>
      </header>

      <div className="mt-6 px-4">
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
          <CollapsibleContent className="mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
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
                  <SelectTrigger id="is-paid-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                  <SelectTrigger id="landmark-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select a landmark" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Landmarks</SelectItem>
                    {landmarks.map((landmark) => (
                      <SelectItem key={landmark.id} value={landmark.id}>
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
                  <SelectTrigger id="duration-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select duration type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="distance">Distance (km)</SelectItem>
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
                  <SelectTrigger id="status-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
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
          <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="px-4 space-y-4">
            {filteredEvents.map((event) => {
              const { statusLabel, statusClass } = getEventStatus(event);
              return (
                <div key={event.id} className="border rounded-lg shadow-sm bg-white dark:bg-gray-800">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                        {event.title}
                      </h3>
                      <div className="flex flex-col gap-1">
                        <Badge className={statusClass}>{statusLabel}</Badge>
                        <Badge className={event.is_free ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {event.is_free ? "FREE" : `₦${(event.price || 0).toFixed(2)}`}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {event.status === "today" ? "Today" : event.status === "tomorrow" ? "Tomorrow" : formatDate(event.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span>{event.start_time}</span>
                      </div>
                      {event.start_landmark && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span>{event.start_landmark.name}, {event.start_landmark.state}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span>
                          {event.attendees?.length || 0}/{event.max_attendees} spots filled
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-muted-foreground">Organized by:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{event.host_name}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cycling/${event.slug}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
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
              <span className="text-gray-700 dark:text-gray-300">
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
          <div className="flex items-center justify-center h-[50vh] flex-col gap-4">
            <p className="text-muted-foreground text-center p-4">
              No events found. Host an event to see it here.
            </p>
            <Button onClick={() => navigate("/host-cycling")}>
              Host an Event
            </Button>
          </div>
        )}
        <Navbar />
      </div>
    </div>
  );
};

export default CyclingActivity;
