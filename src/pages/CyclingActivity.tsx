import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, subMonths } from "date-fns";
import Navbar from "@/components/Navbar";

const CyclingActivity = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    durationType: "",
    meetingPoint: "",
    timeline: "",
    cost: "",
    status: "",
  });

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("cycling_events")
        .select(`
          *,
          start_landmark:landmarks!start_landmark_id(name)
        `)
        .order("event_date", { ascending: true });
      if (!error) setEvents(data);
      else console.error("Error fetching cycling events:", error);
    };
    fetchEvents();
  }, []);

  const getEventStatus = (eventDate: string) => {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));
    const eventDay = startOfDay(new Date(eventDate));

    if (eventDay.getTime() === today.getTime()) return "today";
    if (eventDay.getTime() === tomorrow.getTime()) return "tomorrow";
    if (eventDay > now) return "upcoming";
    return "passed";
  };

  const applyFilters = (event: any) => {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    const status = getEventStatus(event.event_date);

    // Duration type filter
    if (filters.durationType && event.duration_type !== filters.durationType) return false;

    // Meeting point filter
    if (filters.meetingPoint && !event.start_landmark?.name.toLowerCase().includes(filters.meetingPoint.toLowerCase())) return false;

    // Cost filter
    if (filters.cost && filters.cost !== "all") {
      if (filters.cost === "free" && !event.is_free) return false;
      if (filters.cost === "paid" && event.is_free) return false;
    }

    // Status filter
    if (filters.status && filters.status !== "all" && status !== filters.status) return false;

    // Timeline filter
    if (filters.timeline && filters.timeline !== "all") {
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      if (filters.timeline === "this_week" && (eventDate < thisWeekStart || eventDate > thisWeekEnd)) return false;
      if (filters.timeline === "next_week" && (eventDate < nextWeekStart || eventDate > nextWeekEnd)) return false;
      if (filters.timeline === "this_month" && (eventDate < thisMonthStart || eventDate > thisMonthEnd)) return false;
      if (filters.timeline === "last_month" && (eventDate < lastMonthStart || eventDate > lastMonthEnd)) return false;
    }

    return true;
  };

  const filteredEvents = events.filter(applyFilters);

  const resetFilters = () => {
    setFilters({
      durationType: "",
      meetingPoint: "",
      timeline: "",
      cost: "",
      status: "",
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
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
            <h1 className="text-2xl font-bold">Cycling</h1>
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
          onOpenChange={setIsFilterOpen}
          className="mb-4"
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter size={16} className="mr-2" />
              {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="durationType">Duration Type</Label>
                <Input
                  id="durationType"
                  placeholder="e.g., hours"
                  value={filters.durationType}
                  onChange={(e) => setFilters({ ...filters, durationType: e.target.value })}
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="meetingPoint">Meeting Point</Label>
                <Input
                  id="meetingPoint"
                  placeholder="e.g., Park"
                  value={filters.meetingPoint}
                  onChange={(e) => setFilters({ ...filters, meetingPoint: e.target.value })}
                  className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, cost: value })} value={filters.cost}>
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select cost" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, status: value })} value={filters.status}>
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, timeline: value })} value={filters.timeline}>
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="next_week">Next Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-800 dark:text-gray-200">{event.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Date: {new Date(event.event_date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="text-gray-600 dark:text-gray-300">Time: {event.start_time}</p>
                <p className="text-gray-600 dark:text-gray-300">Start: {event.start_landmark?.name}</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Status: {getEventStatus(event.event_date).charAt(0).toUpperCase() + getEventStatus(event.event_date).slice(1)}
                </p>
                <p className="text-gray-600 dark:text-gray-300">Cost: {event.is_free ? "Free" : "Paid"}</p>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => navigate(`/cycling/${event.slug}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default CyclingActivity;
