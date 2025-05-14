import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Calendar, MapPin, Users, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isToday, isPast, differenceInHours } from "date-fns";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  total_slots: number;
  venue: {
    slug: string;
    name: string;
    city: string;
    state: string | null;
  } | null;
  players: {
    player_name: string;
  }[];
};

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string | null;
};

const ITEMS_PER_PAGE = 4;

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "venues">("matches");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchTerm(query);
      searchMatchesAndVenues(query);
      setHasSearched(true);
      setCurrentPage(1); // Reset to first page on new search
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm });
      searchMatchesAndVenues(searchTerm);
      setHasSearched(true);
      setCurrentPage(1); // Reset to first page on new search
    }
  };

  const searchMatchesAndVenues = async (query: string) => {
    setLoading(true);
    try {
      // Step 1: Get all venue IDs that match the query
      const { data: matchingVenues, error: venueError } = await supabase
        .from("venues")
        .select("id")
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`);

      if (venueError) throw venueError;

      const venueIds = matchingVenues.map((venue) => venue.id);

      // Step 2: Search matches by title or associated venue
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, is_paid, price, total_slots,
          venue:venues(slug, name, city, state),
          players:players(player_name)
        `)
        .or(
          `title.ilike.%${query}%,venue_id.in.(${venueIds.join(",")})`
        )
        .order("match_date", { ascending: true });

      if (matchError) throw matchError;

      // Step 3: Search for venues directly
      const { data: venueData, error: venueSearchError } = await supabase
        .from("venues")
        .select("id, slug, name, city, state")
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`);

      if (venueSearchError) throw venueSearchError;

      setMatches(matchData as Match[]);
      setVenues(venueData as Venue[]);
    } catch (error) {
      console.error("Error searching:", error);
      setMatches([]);
      setVenues([]);
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
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getMatchStatus = (matchDate: string, matchTime: string) => {
    const matchDateTime = new Date(`${matchDate}T${matchTime}:00Z`);
    const now = new Date();

    let statusLabel = "Upcoming";
    let statusClass = "bg-blue-100 text-blue-800";

    if (isPast(matchDateTime) && !isToday(matchDateTime)) {
      statusLabel = "Passed";
      statusClass = "bg-gray-200 text-gray-600";
    } else if (isToday(matchDateTime)) {
      const hoursDiff = differenceInHours(matchDateTime, now);
      if (hoursDiff >= 0 && hoursDiff <= 2) {
        statusLabel = "Live";
        statusClass = "bg-red-100 text-red-700 animate-pulse";
      } else if (hoursDiff > 2) {
        statusLabel = "Today";
        statusClass = "bg-green-100 text-green-700";
      } else {
        statusLabel = "Passed";
        statusClass = "bg-gray-200 text-gray-600";
      }
    }

    return { statusLabel, statusClass };
  };

  // Pagination logic
  const totalMatches = matches.length;
  const totalVenues = venues.length;
  const totalPages = Math.ceil(
    activeTab === "matches" ? totalMatches / ITEMS_PER_PAGE : totalVenues / ITEMS_PER_PAGE
  );
  const paginatedMatches = matches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedVenues = venues.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="p-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Find Match or Venue</h1>

        <form onSubmit={handleSearch} className="mb-6 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="search"
            placeholder="Search matches by title, venue, city, or state..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value.replace(/[^A-Za-z\s]/g, ""); // Allow only alphabetical characters and spaces
              setSearchTerm(value);
            }}
            className="pl-12 pr-24 py-2 w-full rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white"
          >
            Search
          </Button>
        </form>

        {hasSearched && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Summary
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {matches.length} {matches.length === 1 ? "match" : "matches"} and{" "}
              {venues.length} {venues.length === 1 ? "venue" : "venues"} for "
              {searchParams.get("q")}"
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "matches" | "venues");
              setCurrentPage(1); // Reset to first page when switching tabs
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger
                value="matches"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
              >
                Matches ({matches.length})
              </TabsTrigger>
              <TabsTrigger
                value="venues"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
              >
                Venues ({venues.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : hasSearched ? (
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="matches">
              {paginatedMatches.length > 0 ? (
                <div className="space-y-4">
                  {paginatedMatches.map((match) => {
                    const { statusLabel, statusClass } = getMatchStatus(
                      match.match_date,
                      match.match_time
                    );

                    return (
                      <div
                        key={match.id}
                        className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-green-500 transition-colors cursor-pointer shadow-sm"
                        onClick={() => navigate(`/match/${match.slug}`)}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            {match.title}
                          </h3>
                          <Badge className={`${statusClass}`}>
                            {statusLabel}
                          </Badge>
                        </div>

                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={16} />
                            <span>
                              {formatDate(match.match_date)} at{" "}
                              {formatTime(match.match_time)}
                            </span>
                          </div>

                          {match.venue && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin size={16} />
                              <span>
                                {match.venue.name}, {match.venue.city}
                                {match.venue.state ? `, ${match.venue.state}` : ""}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Users size={16} />
                              <span>
                                {match.players?.length || 0}/{match.total_slots}{" "}
                                players
                              </span>
                            </div>

                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {match.is_paid
                                ? `₦${match.price?.toFixed(2)}`
                                : "Free"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No matches found for "{searchParams.get("q")}".
                  </p>
                  <p className="mt-2">Try searching with different keywords.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="venues">
              {paginatedVenues.length > 0 ? (
                <div className="space-y-4">
                  {paginatedVenues.map((venue) => (
                    <div
                      key={venue.id}
                      className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-green-500 transition-colors cursor-pointer shadow-sm"
                      onClick={() => navigate(`/venue/${venue.slug}`)}
                    >
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {venue.name}
                      </h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin size={16} />
                          <span>
                            {venue.city}
                            {venue.state ? `, ${venue.state}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No venues found for "{searchParams.get("q")}".
                  </p>
                  <p className="mt-2">Try searching with different keywords.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-muted-foreground text-center p-4">
              Search for matches or venues by title, name, city, or state
            </p>
          </div>
        )}

        {hasSearched && (paginatedMatches.length > 0 || paginatedVenues.length > 0) && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default SearchPage;
