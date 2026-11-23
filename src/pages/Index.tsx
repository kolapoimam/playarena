import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Bike,
  Calendar,
  ChevronRight,
  Heart,
  LayoutGrid,
  MapPin,
  Plus,
  Route,
  Search as SearchIcon,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Seo } from "@/components/Seo";
import { Avatar, Bubble, FunEmpty, IconButton, Meta, Pill, Screen, Section, SPORT, formatNaira, initialsOf, Cover } from "@/components/sc/ui";
import { LocationChip, useUserState } from "@/components/sc/location";
import { sameState } from "@/lib/location";
import { HomeRailSkeleton } from "@/components/sc/skeletons";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  venue: {
    slug: string;
    name: string;
    city: string;
    state?: string | null;
    image_urls: string[] | null;
  } | null;
  type: "football";
};

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  is_free: boolean;
  start_landmark: {
    name: string;
    state: string;
  } | null;
  type: "cycling";
};

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  image_urls: string[] | null;
  is_verified?: boolean | null;
  booking_fee?: number | null;
  match_count: number;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const formatTime = (timeString: string) => {
  if (!timeString) return "";
  if (/am|pm/i.test(timeString)) return timeString.replace(/^0/, "");
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upcomingMatches, setUpcomingMatches] = useState<(Match | CyclingEvent)[]>([]);
  const [popularVenues, setPopularVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isOrganizeDialogOpen, setIsOrganizeDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
        const currentDateTime = new Date(now);
        const currentDate = currentDateTime.toISOString().split("T")[0];
        const currentTime = currentDateTime.toTimeString().slice(0, 5);

        // Fetch football matches
        const { data: upcomingMatchesData, error: matchesError } = await supabase
          .from("matches")
          .select(`
            id,
            slug,
            title,
            match_date,
            match_time,
            is_paid,
            price,
            venue:venues(slug, name, city, state, image_urls)
          `)
          .gte("match_date", currentDate)
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true })
          .limit(5);

        if (matchesError) throw matchesError;

        let filteredMatches: Match[] = upcomingMatchesData
          .filter((match: Match) => {
            const matchDateTime = new Date(`${match.match_date}T${match.match_time}:00`);
            const isToday = match.match_date === currentDate;
            const isTimePassed = isToday && match.match_time < currentTime;
            return !isTimePassed || match.match_date > currentDate;
          })
          .map((match) => ({ ...match, type: "football" as const }));

        // Fetch cycling events
        const { data: cyclingEventsData, error: cyclingError } = await supabase
          .from("cycling_events")
          .select(`
            id,
            slug,
            title,
            event_date,
            start_time,
            is_free,
            start_landmark:landmarks!start_landmark_id(name, state)
          `)
          .gte("event_date", currentDate)
          .order("event_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(5);

        if (cyclingError) throw cyclingError;

        let filteredCyclingEvents: CyclingEvent[] = cyclingEventsData
          .filter((event: CyclingEvent) => {
            const eventDateTime = new Date(`${event.event_date}T${event.start_time}:00`);
            const isToday = event.event_date === currentDate;
            const isTimePassed = isToday && event.start_time < currentTime;
            return !isTimePassed || event.event_date > currentDate;
          })
          .map((event) => ({ ...event, type: "cycling" as const }));

        // Combine and sort matches and cycling events, limit to 5
        const combinedEvents = [...filteredMatches, ...filteredCyclingEvents]
          .sort((a, b) => {
            const dateA = new Date(`${a.match_date || a.event_date}T${a.match_time || a.start_time}:00`);
            const dateB = new Date(`${b.match_date || b.event_date}T${b.match_time || b.start_time}:00`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);

        // If fewer than 5 events, fetch recent matches/events
        if (combinedEvents.length < 5) {
          const { data: recentMatchesData, error: recentMatchesError } = await supabase
            .from("matches")
            .select(`
              id,
              slug,
              title,
              match_date,
              match_time,
              is_paid,
              price,
              venue:venues(slug, name, city, state, image_urls)
            `)
            .order("match_date", { ascending: false })
            .order("match_time", { ascending: false })
            .limit(5 - combinedEvents.length);

          if (recentMatchesError) throw recentMatchesError;

          const { data: recentCyclingData, error: recentCyclingError } = await supabase
            .from("cycling_events")
            .select(`
              id,
              slug,
              title,
              event_date,
              start_time,
              is_free,
              start_landmark:landmarks!start_landmark_id(name, state)
            `)
            .order("event_date", { ascending: false })
            .order("start_time", { ascending: false })
            .limit(5 - combinedEvents.length);

          if (recentCyclingError) throw recentCyclingError;

          const recentMatches = recentMatchesData.map((match) => ({ ...match, type: "football" as const }));
          const recentCyclingEvents = recentCyclingData.map((event) => ({ ...event, type: "cycling" as const }));

          combinedEvents.push(
            ...[...recentMatches, ...recentCyclingEvents]
              .sort((a, b) => {
                const dateA = new Date(`${a.match_date || a.event_date}T${a.match_time || a.start_time}:00`);
                const dateB = new Date(`${b.match_date || b.event_date}T${b.match_time || b.start_time}:00`);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 5 - combinedEvents.length)
          );
        }

        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select(`
            id,
            slug,
            name,
            city,
            state,
            image_urls,
            is_verified,
            booking_fee,
            matches:matches!venue_id(count)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (venuesError) throw venuesError;

        const venuesWithMatchCount = venuesData.map((venue: any) => ({
          ...venue,
          match_count: venue.matches[0]?.count || 0,
        }));

        setUpcomingMatches(combinedEvents);
        setPopularVenues(venuesWithMatchCount as Venue[]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase.from("profiles").select("nickname, first_name").eq("id", userId).maybeSingle();
      setNickname(data?.nickname || data?.first_name || null);
    };
    loadProfile();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handleOrganizeClick = () => {
    setIsOrganizeDialogOpen(true);
  };

  const handleOrganizeSelect = (type: "football" | "cycling") => {
    setIsOrganizeDialogOpen(false);
    navigate(type === "football" ? "/organize" : "/host-cycling");
  };

  const userState = useUserState();
  const [showAll, setShowAll] = useState(false);
  const scoped = userState && !showAll;
  const footballAll = upcomingMatches.filter((e): e is Match => e.type === "football");
  const cyclingAll = upcomingMatches.filter((e): e is CyclingEvent => e.type === "cycling");
  const footballEvents = scoped ? footballAll.filter((m) => sameState(m.venue?.state, userState)) : footballAll;
  const cyclingEvents = scoped ? cyclingAll.filter((e) => sameState(e.start_landmark?.state, userState)) : cyclingAll;
  const venuesShown = scoped ? popularVenues.filter((v) => sameState(v.state, userState)) : popularVenues;

  const quickActions = [
    { label: "Organise", icon: Plus, sport: "football" as const, onClick: handleOrganizeClick },
    { label: "Manage", icon: Users, sport: "guide" as const, onClick: () => navigate("/confirm-checkin") },
    { label: "Host ride", icon: Route, sport: "cycling" as const, onClick: () => navigate("/host-cycling") },
    { label: "List venue", icon: Store, sport: "venue" as const, onClick: () => navigate("/venue-create") },
  ];

  const SportTile = ({
    label,
    sub,
    icon: Icon,
    sport,
    to,
    big,
  }: {
    label: string;
    sub: string;
    icon: typeof Trophy;
    sport: "football" | "cycling" | "venue";
    to: string;
    big?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="relative overflow-hidden rounded-[26px] p-4 flex flex-col justify-between text-left active:scale-[0.98] transition-transform"
      style={{ background: SPORT[sport].solid, color: SPORT[sport].onSolid, height: big ? 196 : 92 }}
    >
      <Icon aria-hidden="true" className="absolute opacity-25" size={big ? 130 : 90} strokeWidth={1.4} style={{ right: -22, bottom: -26 }} />
      <span className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
        <Icon size={22} />
      </span>
      <span className="relative flex flex-col">
        <span className={big ? "text-2xl font-extrabold tracking-[-0.02em]" : "text-lg font-extrabold tracking-[-0.02em]"}>{label}</span>
        <span className="text-[13px] font-semibold opacity-90">{sub}</span>
      </span>
    </button>
  );

  return (
    <>
      <Seo
        title="Sport Cliq | Play Sports Near You in Nigeria"
        description="Discover and join football matches, cycling events, and sports activities in Nigeria. Find football fields near you, organize sports, and connect with Nigerian sports communities. Football in Lagos, Ilorin, Abuja, and more. Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <Screen>
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-[18px]">
          <div className="pt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {nickname ? <Avatar seed={nickname} initials={initialsOf(nickname)} size={46} /> : <img src="/brand/sportcliq-mark.png" alt="SportCliq" className="w-[46px] h-[46px]" />}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] text-sc-ink3 font-semibold">{greeting}</span>
                <span className="text-lg font-extrabold tracking-[-0.02em] truncate">{nickname || "Welcome to SportCliq"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LocationChip />
              <IconButton icon={Bell} label="Notifications" onClick={() => navigate("/profile/notifications")} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="h-[54px] rounded-[18px] bg-white flex items-center gap-2.5 pl-4 pr-2 text-sc-ink3 text-base shadow-card text-left"
          >
            <SearchIcon size={20} />
            <span className="flex-1">Matches, venues, rides</span>
            <span className="w-10 h-10 rounded-[14px] bg-sc-ink text-white flex items-center justify-center">
              <SlidersHorizontal size={18} />
            </span>
          </button>
        </header>

        <div className="flex flex-col gap-[22px] pt-5">
          <div className="flex gap-2 px-5">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="flex-1 flex flex-col items-center gap-2 text-xs font-bold text-sc-ink"
              >
                <span className="w-[58px] h-[58px] rounded-[20px] bg-white flex items-center justify-center shadow-card active:scale-95 transition-transform" style={{ color: SPORT[a.sport].fg }}>
                  <a.icon size={24} />
                </span>
                {a.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 px-5">
            <SportTile label="Play" sub="Football matches" icon={Trophy} sport="football" to="/matches" big />
            <div className="flex flex-col gap-3">
              <SportTile label="Cycle" sub="Group rides" icon={Bike} sport="cycling" to="/cycling-activities" />
              <SportTile label="Book" sub="Venues" icon={Store} sport="venue" to="/venues" />
            </div>
          </div>

          {loading ? (
            <>
              <Section title="Upcoming matches" />
              <HomeRailSkeleton />
              <Section title="Featured venues" />
              <HomeRailSkeleton />
            </>
          ) : (
            <>
              <Section title="Upcoming matches" action="See all" onAction={() => navigate("/matches")} />
              {footballEvents.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto px-5 pb-1 snap-x scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {footballEvents.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => navigate(`/match/${m.slug}`)}
                      className="snap-start shrink-0 w-[250px] rounded-[26px] bg-white p-4 flex flex-col gap-3 text-left"
                    >
                      <div className="relative h-24 rounded-[18px] overflow-hidden flex items-end p-3" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>
                        <Cover src={m.venue?.image_urls?.[0]} kind="football" />
                        <span className="relative h-7 px-2.5 rounded-full bg-white text-sc-ink text-[13px] font-extrabold flex items-center">
                          {m.is_paid ? formatNaira(m.price) : "Free"}
                        </span>
                      </div>
                      <span className="text-[17px] font-extrabold tracking-[-0.02em] line-clamp-1">{m.title}</span>
                      <div className="flex flex-col gap-1.5">
                        <Meta icon={Calendar}>
                          {formatDate(m.match_date)} · {formatTime(m.match_time)}
                        </Meta>
                        {m.venue && <Meta icon={MapPin}>{m.venue.name}{m.venue.city ? `, ${m.venue.city}` : ""}</Meta>}
                      </div>
                      <span className="h-11 rounded-full bg-sc-green text-sc-green-ink text-[15px] font-extrabold flex items-center justify-center">Join match</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-5">
                  <FunEmpty
                    icon={Trophy}
                    sport="football"
                    title={scoped ? `No matches in ${userState} this week` : "No kickoffs on the calendar"}
                    body={scoped ? "Your city is waiting for a whistle. Organise a game and the squad will follow." : "Start the first match and watch the slots fill up."}
                    primary={{ label: "Organise a match", onClick: handleOrganizeClick }}
                    secondary={scoped ? { label: "See all of Nigeria", onClick: () => setShowAll(true) } : undefined}
                  />
                </div>
              )}

              <Section title="Featured venues" action="See all" onAction={() => navigate("/venues")} />
              {venuesShown.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto px-5 pb-1 snap-x scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {venuesShown.map((venue) => {
                    const venueImage = venue.image_urls?.[0];
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => navigate(`/venue/${venue.slug}`)}
                        className="snap-start shrink-0 w-[200px] flex flex-col gap-2.5 text-left"
                      >
                        <div className="relative h-[130px] rounded-[22px] overflow-hidden flex items-center justify-center" style={{ background: SPORT.venue.bg, color: SPORT.venue.fg }}>
                          <Cover src={venueImage} kind="venue" alt={venue.name} />
                          {venue.is_verified && (
                            <span className="absolute left-2.5 top-2.5">
                              <Pill sport="football" icon={ShieldCheck}>Verified</Pill>
                            </span>
                          )}
                          <span className="absolute right-2.5 top-2.5 w-8 h-8 rounded-full bg-white text-sc-ink flex items-center justify-center">
                            <Heart size={16} />
                          </span>
                        </div>
                        <span className="text-base font-extrabold truncate">{venue.name}</span>
                        <span className="text-[13px] text-sc-ink3 truncate">
                          {venue.city}
                          {venue.booking_fee ? ` · ${formatNaira(venue.booking_fee)}/hr` : ` · ${venue.match_count} match${venue.match_count !== 1 ? "es" : ""}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mx-5 rounded-3xl bg-white p-5 flex items-center gap-3">
                  <Bubble icon={Store} sport="venue" />
                  <span className="flex-1 text-sm text-sc-ink2">{scoped ? `No venues listed in ${userState} yet.` : "No venues listed yet."}</span>
                  <button type="button" onClick={() => navigate("/venue-create")} className="text-sm font-bold text-sc-green-dark">
                    List yours
                  </button>
                </div>
              )}

              <Section title="Rides this week" action="See all" onAction={() => navigate("/cycling-activities")} />
              <div className="px-5 flex flex-col gap-3">
                {cyclingEvents.length > 0 ? (
                  cyclingEvents.map((e) => {
                    const d = new Date(e.event_date);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => navigate(`/cycling/${e.slug}`)}
                        className="bg-white rounded-3xl p-[18px] flex items-center gap-3.5 text-left"
                      >
                        <div className="w-[60px] h-[66px] rounded-[18px] flex flex-col items-center justify-center shrink-0" style={{ background: SPORT.cycling.bg }}>
                          <span className="text-[11px] font-extrabold tracking-[0.08em]" style={{ color: SPORT.cycling.fg }}>
                            {d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                          </span>
                          <span className="text-2xl leading-[26px] font-extrabold">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="text-[17px] font-extrabold truncate">{e.title}</span>
                          <span className="text-[13px] text-sc-ink3 truncate">
                            {formatTime(e.start_time)}
                            {e.start_landmark ? ` · ${e.start_landmark.name}` : ""}
                          </span>
                        </div>
                        <Pill sport={e.is_free ? "football" : "tennis"}>{e.is_free ? "Free" : "Paid"}</Pill>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-3xl bg-white p-5 flex items-center gap-3">
                    <Bubble icon={Bike} sport="cycling" />
                    <span className="flex-1 text-sm text-sc-ink2">{scoped ? `No rides in ${userState} yet. Lead the first one.` : "No rides yet. Lead the first one."}</span>
                    <button type="button" onClick={() => navigate("/host-cycling")} className="text-sm font-bold text-sc-green-dark">
                      Host one
                    </button>
                  </div>
                )}
              </div>

              <div className="px-5">
                <img
                  src="/downolad now.jpg"
                  alt="Organise football matches in 3 clicks. Download now on Google Play and the App Store."
                  className="w-full h-auto object-cover rounded-[26px]"
                />
              </div>

              <button
                type="button"
                onClick={() => navigate("/activities")}
                className="mx-5 rounded-3xl bg-white p-4 flex items-center gap-3 text-left"
              >
                <Bubble icon={LayoutGrid} sport="guide" />
                <span className="flex-1 flex flex-col">
                  <span className="text-[15px] font-extrabold">All activities</span>
                  <span className="text-[13px] text-sc-ink3">Matches, rides, bookings and guides</span>
                </span>
                <ChevronRight size={18} className="text-[#9AA19C]" />
              </button>
            </>
          )}
        </div>

        <Dialog open={isOrganizeDialogOpen} onOpenChange={setIsOrganizeDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md rounded-[28px] p-6 bg-white border-none shadow-float font-sans">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-center text-sc-ink tracking-[-0.02em]">What are you organising?</DialogTitle>
              <DialogDescription className="text-center text-sc-ink2 mt-1">Bring people together for a match or a group ride.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => handleOrganizeSelect("football")}
                className="rounded-3xl p-4 h-36 flex flex-col justify-between text-left"
                style={{ background: SPORT.football.solid, color: SPORT.football.onSolid }}
              >
                <Trophy size={28} />
                <span className="text-lg font-extrabold leading-tight">Football match</span>
              </button>
              <button
                type="button"
                onClick={() => handleOrganizeSelect("cycling")}
                className="rounded-3xl p-4 h-36 flex flex-col justify-between text-left"
                style={{ background: SPORT.cycling.solid, color: SPORT.cycling.onSolid }}
              >
                <Bike size={28} />
                <span className="text-lg font-extrabold leading-tight">Cycling ride</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Navbar />
      </Screen>
    </>
  );
};

export default Index;
