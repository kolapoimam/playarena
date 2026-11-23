import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight, Filter, Lock, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTime } from "luxon";
import MatchCard from "@/components/match/MatchCard";
import MatchCodeInput from "@/components/match/MatchCodeInput";
import MatchDetails from "@/components/match/MatchDetails";
import MatchDetailsDialogue from "@/components/match/MatchDetailsDialogue";
import MatchDetailsForm from "@/components/match/MatchDetailsForm";
import MatchForm from "@/components/match/MatchForm";
import MatchHighlights from "@/components/match/MatchHighlights";
import MatchJoinersDialog from "@/components/match/MatchJoinersDialog";
import MatchPreviewDialog from "@/components/match/MatchPreviewDialog";
import MatchReport from "@/components/match/MatchReport";
import MatchSuccessDialog from "@/components/match/MatchSuccessDialog";
import TeamMatchDetails from "@/components/match/TeamMatchDetails";
import UserMatches from "@/components/match/UserMatches";
import { Seo } from "@/components/Seo";

import { Avatar, BackButton, DateBox, Meta, Pill, Progress, formatNaira, initialsOf, sportFor } from "@/components/sc/ui";
// Match type definition based on the existing Supabase schema
interface Match {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  start_time: string;
  end_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  organizer_id: string;
  is_private: boolean;
  access_password: string | null;
  venue: {
    slug: string;
    name: string;
    city: string;
    state: string;
  } | null;
  players: {
    player_name: string;
  }[];
  created_at: string;
  status: string; // live, today, next_day, upcoming, or past
};

type Organizer = {
  id: string;
  name: string;
  phone: string;
  is_verified: boolean;
};

// Venue type for filter dropdown
type Venue = {
  id: string;
  slug: string;
  name: string;
};

const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
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
    fetchOrganizers();
    fetchMatches();
  }, [currentPage, isPaidFilter, venueFilter, durationFilter, timeStart, statusFilter, stateFilter]);

  const fetchOrganizers = async () => {
    try {
      const { data, error } = await supabase
        .from("organizers")
        .select("id, name, phone, is_verified")
        .order("name", { ascending: true });

      if (error) throw error;
      setOrganizers(data as Organizer[]);
    } catch (error: any) {
      console.error("Error fetching organizers:", error.message);
      toast({
        title: "Error",
        description: "Failed to load organizers. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          id, slug, title, match_date, match_time, start_time, end_time, total_slots, is_paid, price, notes, organizer_name, organizer_id, is_private, access_password,
          venue:venues(slug, name, city, state),
          players(*),
          created_at
        `,
          { count: "exact" }
        );

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

      // Sorting logic
      if (currentPage === 1) {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("match_date", { ascending: true }).order("match_time", { ascending: true });
      }

      // Pagination
      const start = (currentPage - 1) * matchesPerPage;
      const end = start + matchesPerPage - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      // Convert and sort matches
      const now = DateTime.now().setZone(LAGOS_TIMEZONE);
      const today = now.startOf('day');
      const tomorrow = today.plus({ days: 1 });
      const dayAfterTomorrow = tomorrow.plus({ days: 1 });

      const sortedMatches = (data as Match[]).map(match => {
        const matchDateTime = DateTime.fromISO(`${match.match_date}T${match.match_time}`).setZone(LAGOS_TIMEZONE);
        const endDateTime = DateTime.fromISO(`${match.match_date}T${match.end_time}`).setZone(LAGOS_TIMEZONE);
        
        // Determine status
        let status: string;
        if (matchDateTime < now) {
          status = "past";
        } else if (matchDateTime >= today && matchDateTime < tomorrow) {
          status = "today";
          if (matchDateTime <= now && now <= endDateTime) {
            status = "live";
          }
        } else if (matchDateTime >= tomorrow && matchDateTime < dayAfterTomorrow) {
          status = "next_day";
        } else {
          status = "upcoming";
        }

        return {
          ...match,
          status
        };
      })
      .sort((a, b) => {
        // Priority: Live > Today > Next Day > Upcoming > Past
        const statusOrder = {
          live: 0,
          today: 1,
          next_day: 2,
          upcoming: 3,
          past: 4
        };

        // First sort by status priority
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }

        // Then sort by date/time within each group
        const aDateTime = DateTime.fromISO(`${a.match_date}T${a.match_time}`).setZone(LAGOS_TIMEZONE);
        const bDateTime = DateTime.fromISO(`${b.match_date}T${b.match_time}`).setZone(LAGOS_TIMEZONE);
        return aDateTime.toMillis() - bDateTime.toMillis();
      });

      setMatches(sortedMatches);
      setFilteredMatches(sortedMatches);
      setTotalMatches(count!);
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

  const getMatchStatus = (match: Match) => {
    const now = DateTime.now().setZone(LAGOS_TIMEZONE);
    const matchDateTime = DateTime.fromISO(`${match.match_date}T${match.match_time}`).setZone(LAGOS_TIMEZONE);
    const endDateTime = DateTime.fromISO(`${match.match_date}T${match.end_time}`).setZone(LAGOS_TIMEZONE);

    if (match.status === "live") return { statusLabel: "Live", statusClass: "bg-red-100 text-red-700 animate-pulse" };
    if (match.status === "today") return { statusLabel: "Today", statusClass: "bg-sc-green-bg text-sc-green-dark" };
    if (match.status === "next_day") return { statusLabel: "Tomorrow", statusClass: "bg-yellow-100 text-yellow-700" };
    if (match.status === "upcoming") return { statusLabel: "Upcoming", statusClass: "bg-blue-100 text-blue-800" };
    return { statusLabel: "Passed", statusClass: "bg-sc-soft2 text-sc-ink3" };
  };

  const formatDate = (dateString: string) => {
    const date = DateTime.fromISO(dateString, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return date.toFormat("ccc, d LLL");
  };

  const formatTime = (timeString: string) => {
    const time = DateTime.fromISO(`2000-01-01T${timeString}Z`, { zone: "utc" }).setZone(LAGOS_TIMEZONE);
    return time.toFormat("hh:mm a");
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
    <>
      <Seo
        title="Matches | Sport Cliq"
        description="Browse and join football matches on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-32 bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"><Button className="h-11 px-4 rounded-full bg-sc-green text-sc-green-ink font-bold text-sm" onClick={() => navigate("/organize")}>
              <Plus size={18} /> Organise
            </Button></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Football matches</h1>
        </header>

        <div className="mt-4 px-5">
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
            <CollapsibleContent className="mt-4 p-4 rounded-3xl bg-white dark:bg-gray-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="is-paid-filter" className="text-sc-ink2 dark:text-gray-300">Payment Type</Label>
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
                  <Label htmlFor="status-filter" className="text-sc-ink2 dark:text-gray-300">Status</Label>
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
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="next_day">Tomorrow</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="venue-filter" className="text-sc-ink2 dark:text-gray-300">Venue</Label>
                  <Select
                    value={venueFilter || "all"}
                    onValueChange={(value) => {
                      setVenueFilter(value === "all" ? null : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="venue-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                  <Label htmlFor="duration-filter" className="text-sc-ink2 dark:text-gray-300">Duration</Label>
                  <Select
                    value={durationFilter}
                    onValueChange={(value) => {
                      setDurationFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="duration-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                  <Label htmlFor="time-start" className="text-sc-ink2 dark:text-gray-300">Start Time</Label>
                  <Select
                    value={timeStart || "all"}
                    onValueChange={(value) => {
                      setTimeStart(value === "all" ? "" : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="time-start" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                  <Label htmlFor="state-filter" className="text-sc-ink2 dark:text-gray-300">State</Label>
                  <Select
                    value={stateFilter || "all"}
                    onValueChange={(value) => {
                      setStateFilter(value === "all" ? null : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="state-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sc-green"></div>
          </div>
        ) : matches.length > 0 ? (
          <div className="px-5 flex flex-col gap-3.5">
            {matches.map((match) => {
              const { statusLabel, statusClass } = getMatchStatus(match);
              const organizer = organizers.find(org => org.id === match.organizer_id);
              const isVerified = organizer?.is_verified || false;
              const isAccessible = !match.is_private || hasAccess(match.slug);
              
              return (
                <div key={match.id} className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
                  <div className="flex gap-3.5 items-center">
                    <DateBox date={match.match_date} />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-lg font-extrabold tracking-[-0.02em] truncate flex items-center gap-1.5">
                        {match.title}
                        {match.is_private && <Lock size={15} className="text-sc-ink3 shrink-0" aria-label="Private match" />}
                      </span>
                      <span className="text-[13px] text-sc-ink3">
                        {match.status === "today" ? "Today" : match.status === "next_day" ? "Tomorrow" : formatDate(match.match_date)} · {formatTime(match.match_time)}
                      </span>
                    </div>
                  </div>
                  {match.venue && (
                    <button type="button" onClick={() => navigate(`/venue/${match.venue.slug}`)} className="text-left">
                      <Meta icon={MapPin}>
                        {match.venue.name}, {match.venue.city}
                      </Meta>
                    </button>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    <Pill sport={statusLabel === "Live" ? "red" : statusLabel === "Today" ? "football" : statusLabel === "Tomorrow" ? "tennis" : statusLabel === "Passed" ? "gray" : "guide"}>{statusLabel}</Pill>
                    <Pill sport={match.is_paid ? "tennis" : "football"}>{match.is_paid ? formatNaira(match.price) : "Free"}</Pill>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-sc-ink3 font-semibold">
                        {Math.max(0, match.total_slots - (match.players?.length || 0))} spots left
                      </span>
                      <span className="font-extrabold">
                        {match.players?.length || 0}/{match.total_slots}
                      </span>
                    </div>
                    <Progress value={match.total_slots ? ((match.players?.length || 0) * 100) / match.total_slots : 0} />
                  </div>
                  <div className="h-px bg-sc-line" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={initialsOf(match.organizer_name)} sport={sportFor(match.organizer_name)} size={34} />
                      <span className="flex flex-col min-w-0">
                        <span className="text-[11px] text-sc-ink3 font-semibold">Organised by</span>
                        <span className="text-sm font-bold flex items-center gap-1 truncate">
                          {match.organizer_name}
                          {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4" />}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/match/${match.slug}`)}
                      className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-bold flex items-center gap-1 shrink-0"
                    >
                      View <ChevronRight size={16} />
                    </button>
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
              <span className="text-sc-ink2 dark:text-gray-300">
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
    </>
  );
};

export default Matches;
