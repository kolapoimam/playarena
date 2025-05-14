import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight, Filter, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTime } from "luxon";

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
  is_private: boolean;
  access_password: string | null;
  status: string;
  cancellation_status: boolean;
  skill_level?: string;
  match_type?: string;
  venue: {
    slug: string;
    name: string;
    city: string;
    state: string;
  } | null;
  players: {
    player_name: string;
    number_of_slots: number;
    cancellation_status: boolean;
  }[];
  created_at: string;
};

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
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const matchesPerPage = 4;
  const LAGOS_TIMEZONE = "Africa/Lagos";

  useEffect(() => {
    fetchVenues();
    fetchMatches();
  }, [currentPage, isPaidFilter, venueFilter, durationFilter, timeStart, statusFilter, stateFilter]);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("id, slug, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setVenues(data as Venue[]);
    } catch (error: any) {
      console.error("Error fetching venues:", error.message);
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
          id, slug, title, match_date, match_time, total_slots, is_paid, price, notes, organizer_name, is_private, access_password, status, cancellation_status, skill_level, match_type,
          venue:venues(slug, name, city, state),
          players(player_name, number_of_slots, cancellation_status),
          created_at
        `,
          { count: "exact" }
        );

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
        const today = DateTime.now().setZone(LAGOS_TIMEZONE).startOf("day");
        let startDate: DateTime, endDate: DateTime;

        switch (durationFilter) {
          case "today":
            startDate = today;
            endDate = today;
            break;
          case "this_week":
            startDate = today.startOf("week");
            endDate = startDate.plus({ days: 6 });
            break;
          case "next_week":
            startDate = today.startOf("week").plus({ weeks: 1 });
            endDate = startDate.plus({ days: 6 });
            break;
          case "this_month":
            startDate = today.startOf("month");
            endDate = today.endOf("month");
            break;
          default:
            startDate = today;
            endDate = today;
        }

        const startDateStr = startDate.toISODate();
        const endDateStr = endDate.toISODate();
        query = query.gte("match_date", startDateStr!).lte("match_date", endDateStr!);
      }
      if (timeStart) {
        const timeRanges: { [key: string]: { start: string; end: string } } = {
          morning: { start: "06:00:00", end: "11:59:59" },
          afternoon: { start: "12:00:00", end: "17:59:59" },
          evening: { start: "18:00:00", end: "23:59:59" },
        };
        query = query.gte("match_time", timeRanges[timeStart].start).lte("match_time", timeRanges[timeStart].end);
      }
      if (stateFilter && stateFilter !== "all") {
        query = query.eq("venue.state", stateFilter);
      }

      if (currentPage === 1) {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("match_date", { ascending: true }).order("match_time", { ascending: true });
      }

      const start = (currentPage - 1) * matchesPerPage;
      const end = start + matchesPerPage - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      const fetchedMatches = data as Match[];
      setMatches(fetchedMatches);
      setTotalMatches(count || 0);
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      setMatches([]);
      setTotalMatches(0);
      toast({
        title: "Error",
        description: "Failed to load matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = DateTime.fromISO(dateString, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return date.toFormat("ccc, d LLL");
  };

  const formatTime = (timeString: string) => {
    const time = DateTime.fromISO(`2000-01-01T${timeString}Z`, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return time.toFormat("hh:mm a");
  };

  const getMatchStatus = (match: Match) => {
    const matchDateTime = DateTime.fromISO(`${match.match_date}T${match.match_time}`, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    const now = DateTime.now().setZone(LAGOS_TIMEZONE);
    const fortyEightHoursAfter = matchDateTime.plus({ hours: 48 });

    let statusLabel = "";
    let statusClass = "";
    let isFeedbackWindow = false;

    if (match.cancellation_status) {
      statusLabel = "Cancelled";
      statusClass = "bg-red-100 text-red-800";
    } else {
      switch (match.status) {
        case "cancelled":
          statusLabel = "Cancelled";
          statusClass = "bg-red-100 text-red-800";
          break;
        case "completed":
          statusLabel = "Completed";
          statusClass = "bg-gray-100 text-gray-800";
          isFeedbackWindow = now >= matchDateTime && now < fortyEightHoursAfter;
          break;
        case "live":
          statusLabel = "Live";
          statusClass = "bg-green-100 text-green-800 animate-pulse";
          break;
        case "upcoming":
          statusLabel = matchDateTime.hasSame(now, "day") ? "Today" : "Upcoming";
          statusClass = matchDateTime.hasSame(now, "day")
            ? "bg-green-100 text-green-700"
            : "bg-blue-100 text-blue-800";
          break;
        default:
          statusLabel = "Upcoming";
          statusClass = "bg-blue-100 text-blue-800";
      }
    }

    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const isFull = totalPlayerSlots >= match.total_slots;

    return { statusLabel, statusClass, isFull, isFeedbackWindow };
  };

  const hasAccess = (matchSlug: string) => {
    return !!localStorage.getItem(`match_access_${matchSlug}`);
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
    setStateFilter(null);
    setCurrentPage(1);
  };

  const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
    "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
    "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
  ];

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
            <h1 className="text-2xl font-bold">Matches</h1>
          </div>
          <Button
            className="bg-playarena-500 hover:bg-playarena-600 text-white"
            onClick={() => navigate("/organize")}
          >
            Organize Match
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="is-paid-filter" className="text-gray-700 dark:text-gray-300">Payment Type</Label>
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
                <Label htmlFor="venue-filter" className="text-gray-700 dark:text-gray-300">Venue</Label>
                <Select
                  value={venueFilter || "all"}
                  onValueChange={(value) => {
                    setVenueFilter(value === "all" ? null : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="venue-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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

              <div>
                <Label htmlFor="duration-filter" className="text-gray-700 dark:text-gray-300">Duration</Label>
                <Select
                  value={durationFilter}
                  onValueChange={(value) => {
                    setDurationFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="duration-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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

              <div>
                <Label htmlFor="time-start" className="text-gray-700 dark:text-gray-300">Start Time</Label>
                <Select
                  value={timeStart || "all"}
                  onValueChange={(value) => {
                    setTimeStart(value === "all" ? "" : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="time-start" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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

              <div>
                <Label htmlFor="state-filter" className="text-gray-700 dark:text-gray-300">State</Label>
                <Select
                  value={stateFilter || "all"}
                  onValueChange={(value) => {
                    setStateFilter(value === "all" ? null : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="state-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {nigerianStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
        </div>
      ) : matches.length > 0 ? (
        <div className="px-4 space-y-4">
          {matches.map((match) => {
            const { statusLabel, statusClass, isFull, isFeedbackWindow } = getMatchStatus(match);
            const isAccessible = !match.is_private || hasAccess(match.slug);
            const totalPlayerSlots = match.players.reduce(
              (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
              0
            );

            return (
              <div 
                key={match.id} 
                className="border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-800"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                      {match.title}{" "}
                      {match.is_private && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock size={16} className="inline text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This is a private match</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </h3>
                    <div className="flex flex-col gap-1">
                      <Badge className={statusClass}>{statusLabel}</Badge>
                      <Badge
                        className={
                          match.is_paid
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }
                      >
                        {match.is_paid ? `₦${match.price?.toFixed(2)}` : "FREE"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
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
                        {totalPlayerSlots}/{match.total_slots} spots filled
                      </span>
                    </div>

                    {match.skill_level && (
                      <div className="flex items-center gap-2">
                        <span>Skill Level: {match.skill_level}</span>
                      </div>
                    )}

                    {match.match_type && (
                      <div className="flex items-center gap-2">
                        <span>Match Type: {match.match_type}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground">Organized by:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{match.organizer_name}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {isFeedbackWindow ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                        >
                          Give Feedback
                        </Button>
                      ) : (match.cancellation_status || match.status === "cancelled" || match.status === "completed" || isFull) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          {match.cancellation_status || match.status === "cancelled"
                            ? "Cancelled"
                            : match.status === "completed"
                            ? "Completed"
                            : "Full"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/join/${match.slug}`)}
                        >
                          Join Match
                        </Button>
                      )}
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
            <span className="text-gray-7
00 dark:text-gray-300">
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
