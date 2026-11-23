import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  ExternalLink,
  Bell,
  Lock,
  Repeat
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { addHours } from "date-fns";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PlayersTable from "@/components/match/PlayersTable";
import ActivityShare from "@/components/sc/ActivityShare";
import { AddToCalendarSheet, CalEvent, DirectionsButton } from "@/components/sc/external";
import { Seo } from "@/components/Seo";

import { Avatar, BackButton, Bubble, IconButton, Pill, ScButton, SPORT, StickyFooter, formatNaira, formatShortDate, formatTime12, initialsOf, Cover } from "@/components/sc/ui";
import { RowsSkeleton, DetailSkeleton } from "@/components/sc/skeletons";
const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

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
  player_number_required: boolean;
  is_private: boolean;
  access_password: string | null;
  sell_tickets: boolean;
  ticket_price: number | null;
  max_tickets: number | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    map_link: string | null;
  } | null;
  players: {
    player_name: string;
    player_status: 'Registered' | 'Checked In' | 'Absent';
    number_of_slots: number;
  }[];
};

const MatchDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!slug) return;
    checkMatchAccess(slug);
  }, [slug]);

  const checkMatchAccess = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          is_recurring, recurring_frequency, recurring_occurrences,
          venue:venues(id, slug, name, city, map_link, image_urls),
          players(player_name, player_status, number_of_slots)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      const matchData = data as Match;
      if (matchData.is_private) {
        setPasswordDialogOpen(true);
        setLoading(false);
      } else {
        setMatch(matchData);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const verifyPassword = async () => {
    if (!slug) {
      navigate("/matches");
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .select("access_password, is_private")
        .eq("slug", slug)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to verify access. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      if (!data.is_private) {
        fetchMatch(slug);
        setPasswordDialogOpen(false);
        return;
      }

      if (data.access_password === password) {
        localStorage.setItem(`match_access_${slug}`, "true");
        setPasswordDialogOpen(false);
        fetchMatch(slug);
      } else {
        toast({
          title: "Error",
          description: "Incorrect or expired password. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      toast({
        title: "Error",
        description: "Failed to verify access. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const fetchMatch = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          is_recurring, recurring_frequency, recurring_occurrences,
          venue:venues(id, slug, name, city, map_link, image_urls),
          players(player_name, player_status, number_of_slots)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      setMatch(data as Match);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getMatchStatus = () => {
    if (!match) return { isStarted: false, isEnded: false, isFull: false };
    
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const matchEndTime = addHours(matchDateTime, 2); // Match duration is 2 hours
    const now = new Date();
    
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const isFull = totalPlayerSlots >= match.total_slots;
    const isStarted = now >= matchDateTime && now < matchEndTime;
    const isEnded = now >= matchEndTime;
    
    return { isStarted, isEnded, isFull };
  };

  const [calOpen, setCalOpen] = useState(false);
  const calEvent: CalEvent | null = match
    ? (() => {
        const start = new Date(`${match.match_date}T${match.match_time}`);
        return {
          title: `SportCliq: ${match.title}`,
          start,
          end: new Date(start.getTime() + 2 * 60 * 60 * 1000),
          location: match.venue ? `${match.venue.name}, ${match.venue.city}` : "",
          details: `Football match organised by ${match.organizer_name}.${match.notes ? `\n\n${match.notes}` : ""}${match.is_private && match.access_password ? `\n\nAccess password: ${match.access_password}` : ""}`,
          url: `https://app.sportcliq.com/match/${match.slug}`,
        };
      })()
    : null;
  const addToCalendar = () => setCalOpen(true);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!match && !passwordDialogOpen) {
    return (
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
          <p className="text-muted-foreground">The match you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (passwordDialogOpen) {
    return (
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-card dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-sc-ink dark:text-white text-center">Access Required</DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300 text-center mt-2">
              This is a private match. Please enter the 6-character access password to view details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-sc-line dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sc-ink dark:text-white bg-sc-soft dark:bg-gray-700"
              maxLength={6}
            />
          </div>
          <DialogFooter className="flex justify-center">
            <Button 
              className="bg-sc-green hover:brightness-95 text-sc-green-ink px-6 py-2 rounded-full transition-colors font-bold"
              onClick={verifyPassword}
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const { isStarted, isEnded, isFull } = getMatchStatus();
  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  return (
    <>
      <Seo
        title={match ? `${match.title} | Match Detail | Sport Cliq` : "Match Detail | Sport Cliq"}
        description={match ? `Details for ${match.title} match on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech.` : "View match details on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."}
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
        jsonLd={{
          "@type": "SportsEvent",
          name: match.title,
          sport: "Football",
          startDate: `${match.match_date}T${(match.match_time || "00:00").slice(0, 5)}:00+01:00`,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: match.venue
            ? { "@type": "SportsActivityLocation", name: match.venue.name, address: { "@type": "PostalAddress", addressLocality: match.venue.city, addressCountry: "NG" } }
            : undefined,
          organizer: { "@type": "Organization", name: match.organizer_name },
          maximumAttendeeCapacity: match.total_slots,
          offers: { "@type": "Offer", price: match.is_paid ? match.price ?? 0 : 0, priceCurrency: "NGN", availability: isFull ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: window.location.href },
          url: window.location.href,
        }}
      />
      <div className="min-h-screen pb-36 bg-sc-bg text-sc-ink font-sans">
        <div className="relative h-[300px] overflow-hidden rounded-b-[36px] bg-sc-green">
          <Cover src={(match as any).venue?.image_urls?.[0]} kind="football" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
          <div className="absolute left-5 right-5 flex justify-between" style={{ top: "max(env(safe-area-inset-top), 1rem)" }}>
            <BackButton className="mt-3" />
            <div className="flex gap-2 mt-3">
              <IconButton icon={Bell} label="Add to calendar" onClick={addToCalendar} />
            </div>
          </div>
          <div className="absolute left-5 right-5 bottom-[26px] flex flex-col gap-2.5 text-white">
            <div className="flex gap-1.5 flex-wrap">
              {(match as any).match_type && <Pill sport="ink">{(match as any).match_type}</Pill>}
              {(match as any).skill_level && <Pill sport="ink">{(match as any).skill_level}</Pill>}
              {(match as any).gender && <Pill sport="ink">{(match as any).gender}</Pill>}
              {match.is_private && <Pill sport="ink" icon={Lock}>Private</Pill>}
            </div>
            <h1 className="m-0 text-[32px] leading-9 font-extrabold tracking-[-0.03em]">{match.title}</h1>
          </div>
        </div>

        <div className="px-5 pt-[18px] flex flex-col gap-3.5">
          {isEnded ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold bg-sc-soft2 text-sc-ink2">This match has passed</div>
          ) : isStarted ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>This match has started</div>
          ) : isFull ? (
            <div className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: SPORT.red.bg, color: SPORT.red.fg }}>This match is completely filled up</div>
          ) : null}

          <div className="flex gap-2.5">
            {[
              { icon: Calendar, sport: "football" as const, label: "Date", value: new Date(match.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
              { icon: Clock, sport: "guide" as const, label: "Time", value: formatTime(match.match_time) },
              { icon: Users, sport: "tennis" as const, label: "Entry", value: match.is_paid ? formatNaira(match.price) : "Free" },
            ].map((f) => (
              <div key={f.label} className="flex-1 min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-2">
                <Bubble icon={f.icon} sport={f.sport} size={34} />
                <span className="text-xs text-sc-ink3 font-semibold">{f.label}</span>
                <span className="text-[15px] font-extrabold truncate">{f.value}</span>
              </div>
            ))}
          </div>

          <PlayersTable
            match={match}
            navigate={navigate}
            isEnded={isEnded}
            isFull={isFull}
            totalPlayerSlots={totalPlayerSlots}
          />

          {match.venue && (
            <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
              <button type="button" onClick={() => navigate(`/venue/${match.venue?.slug}`)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                <Bubble icon={MapPin} sport="venue" size={52} radius={16} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-base font-extrabold truncate">{match.venue.name}</span>
                  <span className="text-[13px] text-sc-ink3 truncate">{match.venue.city}</span>
                </span>
              </button>
              <DirectionsButton url={match.venue.map_link} label="Directions in Google Maps" className="w-10 h-10 rounded-full bg-sc-soft text-sc-ink flex items-center justify-center shrink-0">
                <ExternalLink size={18} />
              </DirectionsButton>
            </div>
          )}

          <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
            <Avatar seed={match.organizer_name} initials={initialsOf(match.organizer_name)} sport="pink" size={48} />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-xs text-sc-ink3 font-semibold">Organiser</span>
              <span className="text-base font-extrabold flex items-center gap-1.5 truncate">
                {match.organizer_name}
                <img src="/green-verified.png" alt="Verified" className="w-4 h-4" />
              </span>
            </span>
          </div>

          {(match.notes || (userId && match.is_recurring) || match.player_number_required) && (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <span className="text-base font-extrabold">Match notes</span>
              {match.notes && <p className="m-0 text-sm leading-[22px] text-sc-ink2 whitespace-pre-line">{match.notes}</p>}
              <div className="flex gap-1.5 flex-wrap">
                {match.player_number_required && <Pill sport="guide">Jersey number required</Pill>}
                {userId && match.is_recurring && (
                  <Pill sport="cycling" icon={Repeat}>
                    Repeats {match.recurring_frequency} · {match.recurring_occurrences} times
                  </Pill>
                )}
              </div>
            </div>
          )}

          {!isEnded && (
            <ActivityShare
              info={{
                kind: "match",
                title: match.title,
                dateLabel: new Date(match.match_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
                timeLabel: formatTime12(match.match_time),
                place: match.venue?.name || "Venue to be confirmed",
                city: match.venue?.city,
                priceLabel: match.is_paid ? formatNaira(match.price) : "Free",
                taken: totalPlayerSlots,
                total: match.total_slots,
                chips: [(match as any).match_type, (match as any).skill_level, (match as any).gender].filter(Boolean),
                url: `https://app.sportcliq.com/match/${match.slug}`,
              }}
            />
          )}
        </div>

        <StickyFooter>
          <div className="flex items-center gap-3.5">
            <div className="flex flex-col shrink-0">
              <span className="text-xs text-sc-ink3 font-semibold">{isEnded ? "Played" : "Per player"}</span>
              <span className="text-[22px] font-extrabold tracking-[-0.02em]">{match.is_paid ? formatNaira(match.price) : "Free"}</span>
            </div>
            {isEnded ? (
              match.players.length > 0 ? (
                <ScButton onClick={() => navigate(`/feedback?matchSlug=${match.slug}`)}>Give feedback</ScButton>
              ) : (
                <ScButton kind="soft" disabled>Give feedback</ScButton>
              )
            ) : isFull ? (
              <ScButton kind="soft" disabled>
                Match is full
              </ScButton>
            ) : (
              <ScButton onClick={() => navigate(`/join/${match.slug}`)}>Join match</ScButton>
            )}
          </div>
          {match.sell_tickets && !isEnded && (
            <ScButton kind="white" size="md" onClick={() => navigate(`/ticketing/${match.slug}`)}>
              Buy spectator tickets{match.ticket_price ? ` · ${formatNaira(match.ticket_price)}` : ""}
            </ScButton>
          )}
        </StickyFooter>
        <AddToCalendarSheet open={calOpen} onOpenChange={setCalOpen} event={calEvent} />
      </div>
    </>
  );
};

export default MatchDetail;
