import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ExternalLink, Calendar, Clock, MessageCircle, CalendarPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
  pricing: string | null;
  booking_fee: number | null;
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
          .select("id, slug, name, address, city, state, description, map_link, venue_phone, image_urls, facilities, opening_hours, pricing, booking_fee")
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

  // Initialize editor only when venue is available
  const editor = useEditor({
    extensions: [StarterKit],
    content: venue?.facilities || "<p>No facilities information available.</p>",
    editable: false,
  });

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

  const defaultImage = "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg";
  const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : defaultImage;

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
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

        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{venue.name}</h1>
        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-6">
          <MapPin size={18} className="mr-2" />
          <span>{venue.city}, {venue.state}</span>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Venue Details</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{venue.address}</p>
              </div>

              {venue.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{venue.description}</p>
                </div>
              )}

              {editor && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</h3>
                  <RichTextEditor editor={editor} className="bg-white dark:bg-gray-800" />
                </div>
              )}

              {venue.opening_hours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Opening Hours</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{venue.opening_hours}</p>
                </div>
              )}

              {venue.pricing && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pricing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{venue.pricing}</p>
                </div>
              )}

              {venue.booking_fee !== null && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Fee (per hour)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">NGN {venue.booking_fee?.toFixed(2)}</p>
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

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
              onClick={() => navigate(`/organize?venue=${venue.slug}`)}
            >
              <CalendarPlus size={16} className="mr-2" />
              Organise Match
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 w-full sm:w-auto"
              onClick={handleBookVenue}
              disabled={!venue.venue_phone}
            >
              <MessageCircle size={16} className="mr-2" />
              Book Venue
            </Button>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default VenueDetail;
