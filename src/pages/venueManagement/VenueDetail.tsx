import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ExternalLink, Calendar, Clock, MessageCircle, CalendarPlus, Star, CalendarCheck, Wallet, Info, Building } from "lucide-react";
import Navbar from "@/components/Navbar";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Seo } from "@/components/Seo";

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
    return (
      <div className="flex justify-center items-center min-h-[50vh] bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {error ? "Error Loading Venue" : "Venue Not Found"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
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
      <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
        <style>{quillStyles}</style>
        <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
          <div className="p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:text-gray-200"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Venue Details</h1>
            <div className="w-10"></div>
          </div>
        </header>

        <div className="p-6 max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden mb-6 h-64 shadow-md">
            <img
              src={venueImage}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{venue.name}</h1>
            {venue.verified_status === 'True' && (
              <img 
                src="/green-verified.png" 
                alt="Verified" 
                className="ml-2 w-6 h-6" 
              />
            )}
          </div>
          <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
            <MapPin size={18} className="mr-2" />
            <span>{venue.city}, {venue.state}</span>
          </div>
          <div className="flex items-center text-yellow-500 mb-6">
            <Star size={18} className="mr-2 fill-yellow-500" />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{venue.aggregated_rating?.toFixed(1) || "N/A"}</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div className="flex items-center">
                <MapPin size={18} className="mr-2 text-gray-700 dark:text-gray-300" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{venue.address}</p>
                </div>
              </div>

              {venue.description && (
                <div className="flex items-start">
                  <Info size={18} className="mr-2 text-gray-700 dark:text-gray-300 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                    <ReactQuill
                      value={venue.description || "<p>No description available.</p>"}
                      readOnly={true}
                      modules={quillModules}
                      className="w-full border-none bg-transparent p-0 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {venue.facilities && (
                <div className="flex items-start">
                  <Building size={18} className="mr-2 text-gray-700 dark:text-gray-300 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</h3>
                    <ReactQuill
                      value={venue.facilities || "<p>No facilities information available.</p>"}
                      readOnly={true}
                      modules={quillModules}
                      className="w-full border-none bg-transparent p-0 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {venue.opening_hours && (
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-gray-700 dark:text-gray-300" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Opening Hours</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{venue.opening_hours}</p>
                  </div>
                </div>
              )}

              {venue.booking_fee !== null && (
                <div className="flex items-center">
                  <Wallet size={18} className="mr-2 text-gray-700 dark:text-gray-300" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Fee (per hour)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">NGN {venue.booking_fee?.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {venue.map_link && (
                <div className="pt-2">
                  <a
                    href={venue.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-green-500 hover:text-green-600 text-sm font-medium"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View on Google Maps
                  </a>
                </div>
              )}

              <div className="pt-2">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
                  onClick={handleBookVenue}
                  disabled={!venue.venue_phone}
                >
                  <MessageCircle size={16} className="mr-2" />
                  Contact
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Recent Matches</h2>

            {matchesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => navigate(`/match/${match.slug}`)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{match.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <Calendar size={16} />
                      <span>{formatDate(match.match_date)}</span>
                      <Clock size={16} />
                      <span>{formatTime(match.match_time)}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                      {match.is_paid ? `₦${match.price?.toFixed(2)}` : "Free"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No recent matches found for this venue.</p>
            )}
          </div>

          <div className="mt-6 flex flex-row gap-4 w-full">
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
              onClick={() => navigate(`/venue/${venue.slug}/book`)}
            >
              <CalendarCheck size={16} className="mr-2" />
              Book Venue
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
              onClick={() => navigate(`/organize?venue=${venue.slug}`)}
            >
              <CalendarPlus size={16} className="mr-2" />
              Organise Match
            </Button>
          </div>
        </div>
      </div>

      <Navbar />
    </>
  );
};

export default VenueDetail;
