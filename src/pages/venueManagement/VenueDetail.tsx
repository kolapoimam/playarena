import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ExternalLink, Calendar, Clock, MessageCircle, CalendarPlus, Star, CalendarCheck, Wallet, Info, Building, ShieldCheck, Store } from "lucide-react";
import Navbar from "@/components/Navbar";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Seo } from "@/components/Seo";

import { BackButton, Bubble, DateBox, Meta, Pill, ScButton, SPORT, Spinner, StickyFooter, formatNaira } from "@/components/sc/ui";
import { RowsSkeleton, DetailSkeleton } from "@/components/sc/skeletons";
// Custom CSS to style ReactQuill for description and facilities
const quillStyles = `
  .ql-container {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .ql-editor {
    padding: 0 !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    color: inherit !important;
    font-size: 1rem !important; /* Matches surrounding text size */
  }
  .ql-editor p {
    margin: 0 !important;
  }
  .dark .ql-editor {
    color: #d1d5db !important; /* Tailwind gray-300 */
  }
`;

type Venue = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  description: string | null;
  map_link: string | null;
  venue_phone: string | null;
  image_urls: string[] | null;
  match_count?: number;
  facilities: string | null;
  opening_hours: string | null;
  booking_fee: number | null;
  aggregated_rating: number | null;
  verified_status: 'True' | 'False';
};

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

const VenueDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No venue slug provided.");
      setLoading(false);
      return;
    }

    const fetchVenue = async () => {
      try {
        const { data, error } = await supabase
          .from("venues")
          .select("id, slug, name, address, city, state, description, map_link, venue_phone, image_urls, facilities, opening_hours, booking_fee, aggregated_rating, verified_status")
          .eq("slug", slug)
          .single();

        if (error) throw new Error(error.message || "Failed to fetch venue.");
        setVenue(data as Venue);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("Error fetching venue:", errorMessage);
        setError(errorMessage);
        toast({
          title: "Error",
          description: "Failed to load venue details. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    };

    const fetchMatches = async (venueId: string) => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select("id, slug, title, match_date, match_time, is_paid, price")
          .eq("venue_id", venueId)
          .order("match_date", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message || "Failed to fetch matches.");
        setMatches(data as Match[]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("Error fetching matches:", errorMessage);
        toast({
          title: "Error",
          description: "Failed to load recent matches. Please try again.",
          variant: "destructive",
        });
      } finally {
        setMatchesLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        const venueData = await fetchVenue();
        if (venueData) {
          await fetchMatches(venueData.id);
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, toast]);

  const handleBookVenue = () => {
    if (venue?.venue_phone) {
      const message = encodeURIComponent(`Hello, I'd like to book ${venue.name} for a match. Can you provide more details on availability, pricing (NGN${venue.booking_fee || 0}/hour), and facilities?`);
      window.open(`https://wa.me/+234${venue.venue_phone}?text=${message}`, "_blank");
    }
  };

  // Quill toolbar configuration (read-only, so no toolbar)
  const quillModules = {
    toolbar: false,
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !venue) {
    return (
      <div className="p-6 bg-sc-bg dark:bg-gray-900 min-h-screen">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-sc-ink2 dark:text-gray-300"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2 text-sc-ink dark:text-gray-100">
            {error ? "Error Loading Venue" : "Venue Not Found"}
          </h2>
          <p className="text-sc-ink3 dark:text-gray-400">
            {error || "The venue you're looking for doesn't exist or has been removed."}
          </p>
        </div>
      </div>
    );
  }

  const defaultImage = "/Sportcliq_Stadium_Banner.png";
  const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : defaultImage;

  return (
    <>
      <Seo
        title={venue ? `${venue.name} | Venue | Sport Cliq` : "Venue Detail | Sport Cliq"}
        description={venue ? `Details for ${venue.name} venue on Sport Cliq. Football venues in Lagos, Ilorin, Abuja. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech.` : "View venue details on Sport Cliq. Football venues in Lagos, Ilorin, Abuja. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."}
        url={window.location.href}
        image={venue && venue.image_urls && venue.image_urls[0] ? venue.image_urls[0] : undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-36 bg-sc-bg text-sc-ink font-sans">
        <style>{quillStyles}</style>
        <div className="relative h-[320px] overflow-hidden rounded-b-[36px]" style={{ background: SPORT.venue.solid }}>
          {venue.image_urls && venue.image_urls.length > 0 ? (
            <img src={venue.image_urls[0]} alt={venue.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Store aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/35" size={170} strokeWidth={0.9} />
          )}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="absolute left-5 right-5 flex justify-between" style={{ top: "max(env(safe-area-inset-top), 1rem)" }}>
            <BackButton className="mt-3" />
          </div>
          {venue.image_urls && venue.image_urls.length > 1 && (
            <span className="absolute right-5 bottom-3.5 h-[30px] px-3 rounded-full bg-sc-ink/60 text-white text-[13px] font-bold flex items-center">
              {venue.image_urls.length} photos
            </span>
          )}
        </div>

        <div className="px-5 pt-[18px] flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="flex gap-1.5 flex-wrap">
              {venue.verified_status === "True" && <Pill sport="football" icon={ShieldCheck}>Verified venue</Pill>}
              {venue.aggregated_rating ? <Pill sport="tennis" icon={Star}>{venue.aggregated_rating.toFixed(1)}</Pill> : null}
            </span>
            <h1 className="m-0 text-[30px] leading-[34px] font-extrabold tracking-[-0.03em]">{venue.name}</h1>
            <Meta icon={MapPin}>
              {venue.address ? `${venue.address}, ` : ""}
              {venue.city}, {venue.state}
            </Meta>
          </div>

          <div className="flex gap-2.5">
            {venue.map_link && (
              <a
                href={venue.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-[46px] rounded-full bg-white border border-sc-line text-sc-ink text-[15px] font-bold flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} /> Directions
              </a>
            )}
            <button
              type="button"
              onClick={handleBookVenue}
              disabled={!venue.venue_phone}
              className="flex-1 h-[46px] rounded-full bg-white border border-sc-line text-sc-ink text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageCircle size={18} /> Contact
            </button>
          </div>

          {venue.image_urls && venue.image_urls.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {venue.image_urls.slice(1).map((u) => (
                <img key={u} src={u} alt="" className="w-28 h-20 rounded-2xl object-cover shrink-0" />
              ))}
            </div>
          )}

          {venue.description && (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1">
              <span className="text-base font-extrabold">About</span>
              <ReactQuill value={venue.description} readOnly={true} modules={quillModules} className="w-full border-none bg-transparent p-0 text-sc-ink2" />
            </div>
          )}

          {venue.facilities && (
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1">
              <span className="text-base font-extrabold flex items-center gap-2">
                <Bubble icon={Building} sport="venue" size={32} /> Facilities
              </span>
              <ReactQuill value={venue.facilities} readOnly={true} modules={quillModules} className="w-full border-none bg-transparent p-0 text-sc-ink2" />
            </div>
          )}

          {venue.opening_hours && (
            <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
              <Bubble icon={Clock} sport="guide" size={40} />
              <span className="flex flex-col">
                <span className="text-xs text-sc-ink3 font-semibold">Opening hours</span>
                <span className="text-[15px] font-bold">{venue.opening_hours}</span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">Matches here</h2>
            <button type="button" onClick={() => navigate(`/organize?venue=${venue.slug}`)} className="text-sm font-bold text-sc-green-dark flex items-center gap-1">
              <CalendarPlus size={16} /> Organise
            </button>
          </div>
          {matchesLoading ? (
            <Spinner className="py-4" />
          ) : matches.length > 0 ? (
            matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => navigate(`/match/${match.slug}`)}
                className="bg-white rounded-3xl p-4 flex items-center gap-3 text-left"
              >
                <DateBox date={match.match_date} size={52} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-base font-extrabold truncate">{match.title}</span>
                  <span className="text-[13px] text-sc-ink3">{formatTime(match.match_time)}</span>
                </span>
                <Pill sport={match.is_paid ? "tennis" : "football"}>{match.is_paid ? formatNaira(match.price) : "Free"}</Pill>
              </button>
            ))
          ) : (
            <p className="m-0 text-sm text-sc-ink3">No recent matches at this venue yet.</p>
          )}
        </div>
      </div>

      <StickyFooter>
        <div className="flex items-center gap-3.5">
          {venue.booking_fee !== null && (
            <div className="flex flex-col shrink-0">
              <span className="text-xs text-sc-ink3 font-semibold">Booking fee</span>
              <span className="text-[22px] font-extrabold tracking-[-0.02em]">
                {formatNaira(venue.booking_fee)}
                <span className="text-sm text-sc-ink3">/hr</span>
              </span>
            </div>
          )}
          <ScButton kind="venue" icon={CalendarCheck} onClick={() => navigate(`/venue/${venue.slug}/book`)}>
            Book venue
          </ScButton>
        </div>
      </StickyFooter>
    </>
  );
};

export default VenueDetail;
