import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { Calendar, MapPin, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { DateTime } from "luxon";

interface Match {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  total_slots: number;
  status: string;
  venue: {
    slug: string;
    name: string;
    city: string;
    state: string | null;
  } | null;
  players: {
    player_name: string;
    number_of_slots: number;
    cancellation_status: boolean;
  }[];
}

interface Venue {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string | null;
  image_urls: string[] | null;
  aggregated_rating: number | null;
  match_count: number;
  match_dates: string[];
}

interface CyclingEvent {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  start_landmark_id: string;
  start_landmark: {
    name?: string;
    state?: string;
  } | null;
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
  }[];
}

interface Landmark {
  id_uuid: string;
  name: string;
  state: string;
  description: string | null;
  map_link: string | null;
  cycling_events_count: number;
}

const ITEMS_PER_PAGE = 4;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cyclingEvents, setCyclingEvents] = useState<CyclingEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "venues" | "cycling" | "landmarks">("matches");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const query = searchParams.get("q")?.trim();
    if (query && query.length >= 3) {
      searchAll(query);
      setHasSearched(true);
      setCurrentPage(1);
    } else {
      setHasSearched(false);
      setMatches([]);
      setVenues([]);
      setCyclingEvents([]);
      setLandmarks([]);
    }
  }, [searchParams]);

  const searchAll = async (query: string) => {
    setLoading(true);
    try {
      // Search for venues
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select(`
          id,
          slug,
          name,
          city,
          state,
          is_verified,
          image_urls,
          aggregated_rating
        `)
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`);

      if (venueError) throw venueError;

      // Convert venue data to proper Venue type and fetch match counts/dates separately
      const venuesWithDetails = venueData?.map((venue: any) => {
        const matchResponse = supabase
          .from("matches")
          .select("match_date")
          .eq("venue_id", venue.id);
        const { data: matchData } = matchResponse;
        return {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          city: venue.city,
          state: venue.state,
          is_verified: venue.is_verified,
          image_urls: venue.image_urls,
          aggregated_rating: venue.aggregated_rating,
          match_count: matchData ? matchData.length : 0,
          match_dates: matchData ? matchData.map((m: any) => m.match_date).filter((date: string) => date) : [],
        };
      }) as Venue[] || [];

      const venueIds = venuesWithDetails.map((venue) => venue.id);

      // Search for matches
      const { data: titleMatches, error: titleMatchError } = await supabase
        .from("matches")
        .select(`
          id,
          slug,
          title,
          match_date,
          match_time,
          is_paid,
          price,
          total_slots,
          status,
          venue:venues(id, slug, name, city, state),
          players(player_name, number_of_slots, cancellation_status)
        `)
        .ilike("title", `%${query}%`);

      if (titleMatchError) throw titleMatchError;

      // Search for matches by associated venue
      let venueMatches: any[] = [];
      if (venueIds.length > 0) {
        const { data: venueMatchesData, error: venueMatchError } = await supabase
          .from("matches")
          .select(`
            id,
            slug,
            title,
            match_date,
            match_time,
            is_paid,
            price,
            total_slots,
            status,
            venue:venues(id, slug, name, city, state),
            players(player_name, number_of_slots, cancellation_status)
          `)
          .in("venue_id", venueIds);

        if (venueMatchError) throw venueMatchError;
        venueMatches = venueMatchesData || [];
      }

      // Search for cycling events
      const { data: cyclingData, error: cyclingError } = await supabase
        .from("cycling_events")
        .select(`
          id_uuid,
          slug,
          title,
          event_date,
          start_time,
          event_start_time,
          event_end_time,
          max_attendees,
          host_id,
          host_name,
          host_phone,
          supercode,
          is_free,
          price,
          cancellation_status,
          status,
          start_landmark_id,
          start_landmark:landmarks(id_uuid, name, state),
          cycling_attendees(
            id_uuid,
            attendee_name,
            attendee_phone,
            status,
            confirmation_code,
            details
          )
        `)
        .or(`title.ilike.%${query}%,host_name.ilike.%${query}%`);

      if (cyclingError) throw cyclingError;

      // Search for landmarks
      const { data: landmarkData, error: landmarkError } = await supabase
        .from("landmarks")
        .select(`
          id_uuid,
          name,
          state,
          description,
          map_link
        `)
        .or(`name.ilike.%${query}%,state.ilike.%${query}%`);

      if (landmarkError) throw landmarkError;

      // Get cycling event counts for landmarks
      const landmarksWithCounts = await Promise.all(
        (landmarkData || []).map(async (landmark: any) => {
          const { data: cyclingCount } = await supabase
            .from("cycling_events")
            .select("id_uuid", { count: "exact" })
            .eq("start_landmark_id", landmark.id_uuid);
          
          return {
            ...landmark,
            cycling_events_count: cyclingCount?.length || 0
          };
        })
      );

      // Combine and deduplicate matches
      const combinedMatches = [...(titleMatches || []), ...(venueMatches || [])];
      const uniqueMatches = Array.from(
        new Map(combinedMatches.map((match) => [match.id, match])).values()
      );

      // Convert match data to proper Match type and sort by status
      const matchesWithDetails = uniqueMatches.map((match: any) => ({
        id: match.id,
        slug: match.slug,
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        is_paid: match.is_paid,
        price: match.price,
        total_slots: match.total_slots,
        status: match.status,
        venue: match.venue,
        players: match.players,
        cancellation_status: match.players.some((p: any) => p.cancellation_status),
      })) as Match[];

      // Sort matches: upcoming first, then past
      const now = DateTime.now();
      const sortedMatches = matchesWithDetails.sort((a, b) => {
        const aDateTime = DateTime.fromISO(`${a.match_date}T${a.match_time}`);
        const bDateTime = DateTime.fromISO(`${b.match_date}T${b.match_time}`);

        if (aDateTime > now && bDateTime <= now) return -1;
        if (aDateTime <= now && bDateTime > now) return 1;

        return aDateTime.toMillis() - bDateTime.toMillis();
      });

      setMatches(sortedMatches);
      setVenues(venuesWithDetails);
      setCyclingEvents(cyclingData || []);
      setLandmarks(landmarksWithCounts);
    } catch (error) {
      console.error("Error searching:", error);
      setMatches([]);
      setVenues([]);
      setCyclingEvents([]);
      setLandmarks([]);
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

  const getMatchStatus = (match: Match) => {
    const matchDate = DateTime.fromISO(match.match_date, { zone: "utc" }).setZone("Africa/Lagos");
    const now = DateTime.now().setZone("Africa/Lagos");
    const tomorrow = now.plus({ days: 1 }).startOf("day");
    const startDateTime = DateTime.fromISO(`${matchDate.toISODate()}T${match.match_time}`, { zone: "utc" }).setZone("Africa/Lagos");
    const endDateTime = startDateTime.plus({ hours: 2 });

    let statusLabel = "";
    let statusClass = "";
    let isFeedbackWindow = false;

    if (match.cancellation_status) {
      statusLabel = "Cancelled";
      statusClass = "bg-red-100 text-red-800";
    } else {
      if (now > endDateTime) {
        statusLabel = "Passed";
        statusClass = "bg-gray-200 text-gray-600";
        isFeedbackWindow = true;
      } else if (now >= startDateTime && now <= endDateTime) {
        statusLabel = "Live";
        statusClass = "bg-red-100 text-red-700 animate-pulse";
      } else if (now.hasSame(matchDate, "day") && now < startDateTime) {
        statusLabel = "Today";
        statusClass = "bg-green-100 text-green-700";
      } else if (matchDate > tomorrow) {
        statusLabel = "Upcoming";
        statusClass = "bg-blue-100 text-blue-800";
      } else {
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

  const totalMatches = matches.length;
  const totalVenues = venues.length;
  const totalCycling = cyclingEvents.length;
  const totalLandmarks = landmarks.length;
  const totalPages = Math.ceil(
    activeTab === "matches" ? totalMatches / ITEMS_PER_PAGE :
    activeTab === "venues" ? totalVenues / ITEMS_PER_PAGE :
    activeTab === "cycling" ? totalCycling / ITEMS_PER_PAGE :
    totalLandmarks / ITEMS_PER_PAGE
  );

  const paginatedMatches = matches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedVenues = venues.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedCycling = cyclingEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedLandmarks = landmarks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="p-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Find Match or Venue</h1>

        <div className="mb-6">
          <SearchBar />
        </div>

        {hasSearched && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Summary
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {matches.length} {matches.length === 1 ? "match" : "matches"},{" "}
              {venues.length} {venues.length === 1 ? "venue" : "venues"},{" "}
              {cyclingEvents.length} {cyclingEvents.length === 1 ? "cycling event" : "cycling events"}, and{" "}
              {landmarks.length} {landmarks.length === 1 ? "landmark" : "landmarks"} for "
              {searchParams.get("q")}"
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "matches" | "venues" | "cycling" | "landmarks");
              setCurrentPage(1);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
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
              <TabsTrigger
                value="cycling"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
              >
                Cycling ({cyclingEvents.length})
              </TabsTrigger>
              <TabsTrigger
                value="landmarks"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
              >
                Landmarks ({landmarks.length})
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
                    const { statusLabel, statusClass, isFull, isFeedbackWindow } = getMatchStatus(match);
                    const totalPlayerSlots = match.players.reduce(
                      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
                      0
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
                                {totalPlayerSlots}/{match.total_slots}{" "}
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

                        <div className="mt-4 flex gap-2">
                          {statusLabel === "Passed" ? (
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/match/${match.slug}`);
                              }}
                            >
                              Watch Highlight
                            </Button>
                          ) : match.cancellation_status || isFull ? (
                            <Button
                              className="flex-1 bg-gray-500 text-white rounded-lg"
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
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/join/${match.slug}`);
                              }}
                            >
                              Join Match
                            </Button>
                          )}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {venue.name}
                        </h3>
                        {venue.is_verified && (
                          <img 
                            src="/green-verified.png" 
                            alt="Verified" 
                            className="w-4 h-4 object-contain"
                          />
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin size={16} />
                          <span>
                            {venue.city}
                            {venue.state ? `, ${venue.state}` : ""}
                          </span>
                        </div>
                      </div>
                      {venue.is_verified && (
                        <div className="mt-4">
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/venue/${venue.slug}/book`);
                            }}
                          >
                            Book Now
                          </Button>
                        </div>
                      )}
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

            <TabsContent value="cycling">
              {paginatedCycling.length > 0 ? (
                <div className="space-y-4">
                  {paginatedCycling.map((event) => {
                    const totalAttendees = event.cycling_attendees?.length || 0;
                    const isFull = totalAttendees >= event.max_attendees;
                    const isPast = DateTime.fromISO(event.event_date) < DateTime.now();

                    return (
                      <div
                        key={event.id_uuid}
                        className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-green-500 transition-colors cursor-pointer shadow-sm"
                        onClick={() => navigate(`/cycling/${event.slug}`)}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            {event.title}
                          </h3>
                          <Badge className={event.cancellation_status ? "bg-red-100 text-red-800" : isPast ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-800"}>
                            {event.cancellation_status ? "Cancelled" : isPast ? "Passed" : "Upcoming"}
                          </Badge>
                        </div>

                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={16} />
                            <span>
                              {formatDate(event.event_date)} at{" "}
                              {formatTime(event.start_time)}
                            </span>
                          </div>

                          {event.start_landmark && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin size={16} />
                              <span>
                                {event.start_landmark.name}, {event.start_landmark.state}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Users size={16} />
                              <span>
                                {totalAttendees}/{event.max_attendees} cyclists
                              </span>
                            </div>

                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {event.is_free ? "Free" : `₦${event.price?.toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cycling/${event.slug}`);
                            }}
                            disabled={event.cancellation_status || isFull || isPast}
                          >
                            {event.cancellation_status ? "Cancelled" : isFull ? "Full" : isPast ? "Passed" : "Join Event"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No cycling events found for "{searchParams.get("q")}".
                  </p>
                  <p className="mt-2">Try searching with different keywords.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="landmarks">
              {paginatedLandmarks.length > 0 ? (
                <div className="space-y-4">
                  {paginatedLandmarks.map((landmark) => (
                    <div
                      key={landmark.id_uuid}
                      className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-green-500 transition-colors cursor-pointer shadow-sm"
                      onClick={() => navigate(`/landmark/${landmark.id_uuid}`)}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {landmark.name}
                        </h3>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin size={16} />
                          <span>{landmark.state}</span>
                        </div>
                        {landmark.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {landmark.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users size={16} />
                          <span>{landmark.cycling_events_count} cycling events</span>
                        </div>
                      </div>
                      {landmark.map_link && (
                        <div className="mt-4">
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(landmark.map_link!, "_blank");
                            }}
                          >
                            View on Map
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No landmarks found for "{searchParams.get("q")}".
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

        {hasSearched && totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
                className="w-10 h-10"
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default SearchPage;
