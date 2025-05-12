import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isPast, differenceInHours, isAfter, utcToZonedTime } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

// Match type definition based on the existing Supabase schema
type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

// Venue type for filter dropdown
type Venue = {
  id: string;
  slug: string;
  name: string;
};

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isPaidFilter, setIsPaidFilter] = useState<boolean | null>(null);
  const [venueFilter, setVenueFilter] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [timeStart, setTimeStart] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const matchesPerPage = 4;
  const LAGOS_TIMEZONE = "Africa/Lagos";

  useEffect(() => {
    fetchVenues();
    fetchMatches();
  }, [currentPage, isPaidFilter, venueFilter, durationFilter, timeStart, statusFilter]);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("id, slug, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setVenues(data as Venue[]);
    } catch (error) {
      console.error("Error fetching venues:", error);
      toast({
        title: "Error",
        description: "Failed to load venues for filter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("matches")
        .select(
          `
          id, slug, title, match_date, match_time, total_slots, is_paid, price, notes, organizer_name,
          venue:venues(slug, name, city),
          players(*)
        `,
          { count: "exact" }
        );

      // Apply sorting: newest first on page 1, otherwise by match_date
      if (currentPage === 1) {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("match_date", { ascending: true });
      }

      // Apply filters
      if (isPaidFilter !== null) {
        query = query.eq("is_paid", isPaidFilter);
      }
      if (venueFilter) {
        const venue = venues.find((v) => v.slug === venueFilter);
        if (venue) {
          query = query.eq("venue_id", venue.id);
        }
      }
      if (durationFilter !== "all") {
        const today = utcToZonedTime(new Date(), LAGOS_TIMEZONE);
        today.setHours(0, 0, 0, 0); // Normalize to start of day in Lagos
        let startDate: Date, endDate: Date;

        switch (durationFilter) {
          case "today":
            startDate = today;
            endDate = today;
            break;
          case "this_week":
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Sunday
            break;
          case "next_week":
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay() + 8); // Next Monday
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Next Sunday
            break;
          case "this_month":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
          default:
            startDate = today;
            endDate = today;
        }

        const startDateStr = zonedTimeToUtc(startDate, LAGOS_TIMEZONE).toISOString().split("T")[0];
        const endDateStr = zonedTimeToUtc(endDate, LAGOS_TIMEZONE).toISOString().split("T")[0];
        query = query.gte("match_date", startDateStr).lte("match_date", endDateStr);
      }
      if (timeStart) {
        const timeRanges: { [key: string]: { start: string; end: string } } = {
          morning: { start: "06:00:00", end: "12:00:00" },
          afternoon: { start: "12:00:00", end: "18:00:00" },
          evening: { start: "18:00:00", end: "23:59:59" },
        };
        query = query.gte("match_time", timeRanges[timeStart].start).lte("match_time", timeRanges[timeStart].end);
      }
      if (statusFilter) {
        const today = utcToZonedTime(new Date(), LAGOS_TIMEZONE);
        today.setHours(0, 0, 0, 0);
        const todayStr = zonedTimeToUtc(today, LAGOS_TIMEZONE).toISOString().split("T")[0];
        const now = utcToZonedTime(new Date(), LAGOS_TIMEZONE);
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const twoHoursLaterTime = twoHoursLater.toISOString().slice(11, 19);

        switch (statusFilter) {
          case "Upcoming Match":
            query = query.gt("match_date", todayStr);
            break;
          case "Today's Match":
            query = query
              .eq("match_date", todayStr)
              .gt("match_time", twoHoursLaterTime);
            break;
          case "Live Match":
            query = query
              .eq("match_date", todayStr)
              .lte("match_time", twoHoursLaterTime)
              .gte("match_time", now.toISOString().slice(11, 19));
            break;
          case "Match Passed":
            query = query.or(
              `match_date.lt.${todayStr},and(match_date.eq.${todayStr},match_time.lt.${now.toISOString().slice(11, 19)})`
            );
            break;
        }
      }

      // Apply pagination
      const start = (currentPage - 1) * matchesPerPage;
      const end = start + matchesPerPage - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      setMatches(data as Match[]);
      setTotalMatches(count || 0);
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      setMatches([]);
      setTotalMatches(0);
      if (error.code !== "PGRST116" && error.message !== "JSON object requested, multiple (or no) rows returned") {
        toast({
          title: "Error",
          description: "Failed to load matches. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
    };
    return utcToZonedTime(new Date(dateString), LAGOS_TIMEZONE).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const date = utcToZonedTime(new Date(`2000-01-01T${timeString}Z`), LAGOS_TIMEZONE);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  };

  const totalPages = Math.ceil(totalMatches / matchesPerPage);

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
    setVenueFilter(null);
    setDurationFilter("all");
    setTimeStart("");
    setStatusFilter(null);
    setCurrentPage(1);
  };

  const getMatchStatus = (matchDate: string, matchTime: string) => {
    const matchDateTime = utcToZonedTime(new Date(`${matchDate}T${matchTime}:00Z`), LAGOS_TIMEZONE);
    const now = utcToZonedTime(new Date(), LAGOS_TIMEZONE);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let statusLabel = "Upcoming Match";
    let statusClass = "bg-blue-100 text-blue-800";

    if (isPast(matchDateTime)) {
      statusLabel = "Match Passed";
      statusClass = "bg-gray-200 text-gray-600";
    } else if (isToday(matchDateTime)) {
      const hoursDiff = differenceInHours(matchDateTime, now);
      if (hoursDiff >= 0 && hoursDiff <= 2) {
        statusLabel = "Live Match";
        statusClass = "bg-red-100 text-red-700 animate-pulse";
      } else if (hoursDiff > 2) {
        statusLabel = "Today's Match";
        statusClass = "bg-green-100 text-green-700";
      } else {
        statusLabel = "Match Passed";
        statusClass = "bg-gray-200 text-gray-600";
      }
    } else if (isAfter(matchDateTime, tomorrow)) {
      statusLabel = "Upcoming Match";
      statusClass = "bg-blue-100 text-blue-800";
    }

    return { statusLabel, statusClass };
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <Button
          className="bg-playarena-500 hover:bg-playarena-600 text-white"
          onClick={() => navigate("/organize")}
        >
          Organize Match
        </Button>
      </header>

      {/* Filters */}
      <Collapsible
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        className="px-4 mb-4"
      >
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter size={16} className="mr-2" />
            {isFilterOpen ? "Hide Filters" : "Show Filters"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 p-4 border rounded-lg bg-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paid/Free Filter */}
            <div>
              <Label htmlFor="is-paid-filter">Payment Type</Label>
              <Select
                value={isPaidFilter === null ? "all" : isPaidFilter ? "paid" : "free"}
                onValueChange={(value) => {
                  setIsPaidFilter(value === "all" ? null : value === "paid");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="is-paid-filter">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Venue Filter */}
            <div>
              <Label htmlFor="venue-filter">Venue</Label>
              <Select
                value={venueFilter || "all"}
                onValueChange={(value) => {
                  setVenueFilter(value === "all" ? null : value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="venue-filter">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {venues.map((venue) => (
                    <SelectItem key={venue.slug} value={venue.slug}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Filter */}
            <div>
              <Label htmlFor="duration-filter">Duration</Label>
              <Select
                value={durationFilter}
                onValueChange={(value) => {
                  setDurationFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="duration-filter">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="next_week">Next Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Time Filter */}
            <div>
              <Label htmlFor="time-start">Start Time</Label>
              <Select
                value={timeStart || "all"}
                onValueChange={(value) => {
                  setTimeStart(value === "all" ? "" : value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="time-start">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                  <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                  <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => {
                  setStatusFilter(value === "all" ? null : value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Upcoming Match">Upcoming Match</SelectItem>
                  <SelectItem value="Today's Match">Today's Match</SelectItem>
                  <SelectItem value="Live Match">Live Match</SelectItem>
                  <SelectItem value="Match Passed">Match Passed</SelectItem>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
        </div>
      ) : matches.length > 0 ? (
        <div className="px-4 space-y-4">
          {matches.map((match) => {
            const { statusLabel, statusClass } = getMatchStatus(match.match_date, match.match_time);
            
            return (
              <div 
                key={match.id} 
                className="border rounded-lg overflow-hidden shadow-sm bg-card"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{match.title}</h3>
                    <Badge className={statusClass}>{statusLabel}</Badge>
                  </div>
                  
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{formatDate(match.match_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{formatTime(match.match_time)}</span>
                    </div>
                    
                    {match.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <a
                          href={`/venue/${match.venue.slug}`}
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/venue/${match.venue.slug}`);
                          }}
                        >
                          {match.venue.name}, {match.venue.city}
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>
                        {match.players?.length || 0}/{match.total_slots} spots filled
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground">Organized by:</span>
                      <p className="font-medium">{match.organizer_name}</p>
                    </div>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/match/${match.slug}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={handlePreviousPage}
            >
              <ChevronLeft size={16} className="mr-2" />
              Previous
            </Button>
            <span>
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
        <div className="flex items-center justify-center h-[70vh] flex-col gap-4">
          <p className="text-muted-foreground text-center p-4">
            No matches found. Create or join a match to see it here.
          </p>
          <Button onClick={() => navigate("/organize")}>
            Organize a Match
          </Button>
        </div>
      )}

      <Navbar />
    </div>
  );
};

export default Matches;
