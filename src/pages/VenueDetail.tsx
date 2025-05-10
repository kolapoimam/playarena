import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ExternalLink, Calendar, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";

type Venue = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  description: string | null;
  map_link: string | null;
  image_url: string | null;
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
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
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

  useEffect(() => {
    if (!slug) return;
    
    const fetchVenue = async () => {
      try {
        const { data, error } = await supabase
          .from("venues")
          .select("id, slug, name, address, city, state, description, map_link, image_url")
          .eq("slug", slug)
          .single();

        if (error) throw error;
        setVenue(data as Venue);
        return data;
      } catch (error) {
        console.error("Error fetching venue:", error);
        toast({
          title: "Error",
          description: "Failed to load venue details. Please try again.",
          variant: "destructive",
        });
        throw error;
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

        if (error) throw error;
        setMatches(data as Match[]);
      } catch (error) {
        console.error("Error fetching matches:", error);
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!venue) {
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
          <h2 className="text-xl font-semibold mb-2">Venue Not Found</h2>
          <p className="text-muted-foreground">The venue you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        
        {venue.image_url && (
          <div className="rounded-lg overflow-hidden mb-4 h-48">
            <img 
              src={venue.image_url} 
              alt={venue.name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <h1 className="text-2xl font-bold mb-1">{venue.name}</h1>
        <div className="flex items-center text-muted-foreground mb-4">
          <MapPin size={16} className="mr-1" />
          <span>{venue.city}, {venue.state}</span>
        </div>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-semibold mb-3">Venue Details</h2>
            
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium">Address:</h3>
                <p className="text-sm">{venue.address}</p>
              </div>
              
              {venue.description && (
                <div>
                  <h3 className="text-sm font-medium">Description:</h3>
                  <p className="text-sm">{venue.description}</p>
                </div>
              )}
              
              {venue.map_link && (
                <div className="pt-2">
                  <a 
                    href={venue.map_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary"
                  >
                    <ExternalLink size={16} className="mr-1" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Recent Matches Section */}
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-semibold mb-3">Recent Matches</h2>
            
            {matchesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div 
                    key={match.id} 
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/match/${match.slug}`)}
                  >
                    <h3 className="font-medium">{match.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar size={14} />
                      <span>{formatDate(match.match_date)}</span>
                      <Clock size={14} />
                      <span>{formatTime(match.match_time)}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      {match.is_paid ? `₦${match.price?.toFixed(2)}` : 'Free'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No recent matches found at this venue
              </div>
            )}
          </div>
          
          <Button 
            className="w-full"
            onClick={() => navigate(`/organize?venue=${venue.slug}`)}
          >
            Organize Match at This Venue
          </Button>
        </div>
      </div>
      
      <Navbar />
    </div>
  );
};

export default VenueDetail;
