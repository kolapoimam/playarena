import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Calendar, MapPin, Bike, Clock, Flag, Search as SearchIcon, ShieldCheck, Store, Trophy, X, ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import {
  Bubble,
  DateBox,
  EmptyState,
  ListGroup,
  ListRow,
  Meta,
  PageHeader,
  Pill,
  Progress,
  Screen,
  Segmented,
  Spinner,
  SPORT,
  Sport,
  formatNaira,
} from "@/components/sc/ui";

const RECENT_KEY = "sc_recent_searches";
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};
import { format } from "date-fns";
import { DateTime } from "luxon";
import { Seo } from "@/components/Seo";

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

const ITEMS_PER_PAGE = 4;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "venues">("matches");
  const [currentPage, setCurrentPage] = useState(1);
  const [term, setTerm] = useState(searchParams.get("q") || "");
  const [recent, setRecent] = useState<string[]>(readRecent());

  const saveRecent = (list: string[]) => {
    setRecent(list);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const runSearch = (q: string) => {
    const clean = q.replace(/[^A-Za-z\s]/g, "").trim();
    if (!clean) return;
    saveRecent([clean, ...recent.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 6));
    navigate(`/search?q=${encodeURIComponent(clean)}`);
  };

  useEffect(() => {
    setTerm(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const query = searchParams.get("q")?.trim();
    if (query && query.length >= 3) {
      searchMatchesAndVenues(query);
      setHasSearched(true);
      setCurrentPage(1);
    } else {
      setHasSearched(false);
      setMatches([]);
      setVenues([]);
    }
  }, [searchParams]);

  const searchMatchesAndVenues = async (query: string) => {
    setLoading(true);
    try {
      // Search for venues matching the query in name, city, or state
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

      // Search for matches by title
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

      // Search for matches by associated venue (if any venues were found)
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

      // Combine and deduplicate matches (by id)
      const combinedMatches = [...(titleMatches || []), ...(venueMatches || [])];
      const uniqueMatches = Array.from(
        new Map(combinedMatches.map((match) => [match.id, match])).values()
      );

      // Convert match data to proper Match type and sort by status (upcoming first)
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

      // Filter and sort matches: upcoming first, then past
      const now = DateTime.now();
      const sortedMatches = matchesWithDetails.sort((a, b) => {
        const aDateTime = DateTime.fromISO(`${a.match_date}T${a.match_time}`);
        const bDateTime = DateTime.fromISO(`${b.match_date}T${b.match_time}`);

        // Upcoming matches first
        if (aDateTime > now && bDateTime <= now) return -1;
        if (aDateTime <= now && bDateTime > now) return 1;

        // Then sort by date/time within each group
        return aDateTime.toMillis() - bDateTime.toMillis();
      });

      setMatches(sortedMatches);
      setVenues(venuesWithDetails);
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

  const statusSport = (label: string): Sport =>
    label === "Cancelled" ? "red" : label === "Live" ? "red" : label === "Today" ? "football" : label === "Passed" ? "gray" : "guide";

  const browse: { label: string; icon: LucideIcon; sport: Sport; to: string }[] = [
    { label: "Matches", icon: Trophy, sport: "football", to: "/matches" },
    { label: "Venues", icon: Store, sport: "venue", to: "/venues" },
    { label: "Cycling", icon: Bike, sport: "cycling", to: "/cycling-activities" },
    { label: "Landmarks", icon: Flag, sport: "guide", to: "/landmarks" },
  ];

  return (
    <>
      <Seo
        title="Search Sports, Matches & Venues in Nigeria | Sport Cliq"
        description="Search for football matches, cycling events, and sports venues in Nigeria. Find football fields near you, bicycle training, sports betting, and more. Football in Lagos, Ilorin, Abuja. Livescore, Osimhen, Asisat Oshola."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <Screen>
        <PageHeader title="Search" />

        <div className="px-5 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(term);
            }}
            className="h-[54px] rounded-[18px] bg-white flex items-center gap-2.5 pl-4 pr-2 text-sc-ink3 shadow-card"
          >
            <SearchIcon size={20} className="shrink-0" />
            <input
              aria-label="Search matches or venues"
              value={term}
              onChange={(e) => setTerm(e.target.value.replace(/[^A-Za-z\s]/g, ""))}
              placeholder="Matches, venues, cities"
              className="flex-1 min-w-0 bg-transparent outline-none text-base text-sc-ink placeholder:text-[#8A918C]"
            />
            {term && (
              <button type="button" aria-label="Clear search" onClick={() => setTerm("")} className="w-8 h-8 flex items-center justify-center text-sc-ink3">
                <X size={18} />
              </button>
            )}
            <button type="submit" className="h-10 px-4 rounded-[14px] bg-sc-ink text-white text-sm font-bold">
              Search
            </button>
          </form>
        </div>

        {!hasSearched ? (
          <main className="px-5 pt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-bold text-sc-ink2">Browse</span>
              <div className="grid grid-cols-2 gap-2.5">
                {browse.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => navigate(b.to)}
                    className="relative overflow-hidden h-[92px] rounded-[22px] p-3.5 flex flex-col justify-between text-left active:scale-[0.98] transition-transform"
                    style={{ background: SPORT[b.sport].bg, color: SPORT[b.sport].fg }}
                  >
                    <b.icon aria-hidden="true" className="absolute opacity-30" size={80} strokeWidth={1.4} style={{ right: -14, bottom: -18 }} />
                    <b.icon size={24} />
                    <span className="relative text-base font-extrabold text-sc-ink">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {recent.length > 0 && (
              <ListGroup title="Recent">
                {recent.map((r) => (
                  <ListRow
                    key={r}
                    icon={Clock}
                    sport="gray"
                    title={r}
                    onClick={() => runSearch(r)}
                    chevron={false}
                    right={
                      <span
                        role="button"
                        aria-label={`Remove ${r}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRecent(recent.filter((x) => x !== r));
                        }}
                        className="w-8 h-8 flex items-center justify-center text-sc-ink3"
                      >
                        <X size={16} />
                      </span>
                    }
                  />
                ))}
              </ListGroup>
            )}
            {recent.length === 0 && (
              <p className="text-sm text-sc-ink3 text-center px-6">Search for matches or venues by title, name, city or state.</p>
            )}
          </main>
        ) : (
          <main className="px-5 pt-4 flex flex-col gap-3">
            <Segmented
              value={activeTab}
              onChange={(v) => {
                setActiveTab(v);
                setCurrentPage(1);
              }}
              options={[
                { value: "matches", label: `Matches ${matches.length}` },
                { value: "venues", label: `Venues ${venues.length}` },
              ]}
            />
            <span className="text-[13px] font-semibold text-sc-ink3">
              {matches.length} {matches.length === 1 ? "match" : "matches"} and {venues.length} {venues.length === 1 ? "venue" : "venues"} for “{searchParams.get("q")}”
            </span>

            {loading ? (
              <Spinner />
            ) : activeTab === "matches" ? (
              paginatedMatches.length > 0 ? (
                paginatedMatches.map((match) => {
                  const { statusLabel, isFull } = getMatchStatus(match);
                  const totalPlayerSlots = match.players.reduce(
                    (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
                    0
                  );
                  const pct = match.total_slots ? (totalPlayerSlots * 100) / match.total_slots : 0;
                  return (
                    <div
                      key={match.id}
                      onClick={() => navigate(`/match/${match.slug}`)}
                      className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex gap-3.5 items-center">
                        <DateBox date={match.match_date} />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="text-lg font-extrabold tracking-[-0.02em] truncate">{match.title}</span>
                          <span className="text-[13px] text-sc-ink3">
                            {formatDate(match.match_date)} · {formatTime(match.match_time)}
                          </span>
                        </div>
                      </div>
                      {match.venue && (
                        <Meta icon={MapPin}>
                          {match.venue.name}, {match.venue.city}
                          {match.venue.state ? `, ${match.venue.state}` : ""}
                        </Meta>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        <Pill sport={statusSport(statusLabel)}>{statusLabel}</Pill>
                        <Pill sport={match.is_paid ? "tennis" : "football"}>{match.is_paid ? formatNaira(match.price) : "Free"}</Pill>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-[13px]">
                          <span className="text-sc-ink3 font-semibold">Players</span>
                          <span className="font-extrabold">
                            {totalPlayerSlots}/{match.total_slots}
                          </span>
                        </div>
                        <Progress value={pct} />
                      </div>
                      {statusLabel === "Passed" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/match/${match.slug}`);
                          }}
                          className="h-11 rounded-full bg-sc-green-bg text-sc-green-dark text-[15px] font-bold flex items-center justify-center gap-2"
                        >
                          Watch highlights
                        </button>
                      ) : match.cancellation_status || isFull ? (
                        <button type="button" disabled className="h-11 rounded-full bg-sc-soft text-sc-ink3 text-[15px] font-bold">
                          {match.cancellation_status || match.status === "cancelled" ? "Cancelled" : match.status === "completed" ? "Completed" : "Full"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/join/${match.slug}`);
                          }}
                          className="h-11 rounded-full bg-sc-green text-sc-green-ink text-[15px] font-extrabold"
                        >
                          Join match
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={Trophy} sport="football" title="No matches found" subtitle="Try searching with different keywords." />
              )
            ) : paginatedVenues.length > 0 ? (
              paginatedVenues.map((venue: any) => (
                <div
                  key={venue.id}
                  onClick={() => navigate(`/venue/${venue.slug}`)}
                  className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex gap-3.5 items-center">
                    {venue.image_urls?.[0] ? (
                      <img src={venue.image_urls[0]} alt="" className="w-[60px] h-[60px] rounded-[18px] object-cover shrink-0" />
                    ) : (
                      <Bubble icon={Store} sport="venue" size={60} radius={18} />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-[17px] font-extrabold truncate">{venue.name}</span>
                      <span className="text-[13px] text-sc-ink3 truncate">
                        {venue.city}
                        {venue.state ? `, ${venue.state}` : ""}
                      </span>
                    </div>
                    {venue.is_verified ? <Pill sport="football" icon={ShieldCheck}>Verified</Pill> : <Pill sport="venue">Venue</Pill>}
                  </div>
                  {venue.is_verified && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/venue/${venue.slug}/book`);
                      }}
                      className="h-11 rounded-full text-white text-[15px] font-extrabold"
                      style={{ background: SPORT.venue.solid }}
                    >
                      Book now
                    </button>
                  )}
                </div>
              ))
            ) : (
              <EmptyState icon={Store} sport="venue" title="No venues found" subtitle="Try searching with different keywords." />
            )}

            {!loading && totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-11 h-11 rounded-full bg-white flex items-center justify-center disabled:opacity-40"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-sc-ink2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-11 h-11 rounded-full bg-white flex items-center justify-center disabled:opacity-40"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </main>
        )}

        <Navbar />
      </Screen>
    </>
  );
};

export default SearchPage;
