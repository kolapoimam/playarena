
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form validation schema
const formSchema = z.object({
  player_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

// Match type definition
type Match = {
  id: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  venue: {
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

const JoinMatch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      player_name: "",
    },
  });

  useEffect(() => {
    if (!id) return;
    
    fetchMatch(id);
  }, [id]);

  const fetchMatch = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(*),
          players(*)
        `)
        .eq("id", matchId)
        .single();

      if (error) throw error;

      setMatch(data as Match);
      
      // Check if the match is full
      if (data.players.length >= data.total_slots) {
        toast({
          title: "Match is full",
          description: "Sorry, all spots for this match have been filled.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Format from "14:30:00" to "14:30"
  };

  const onSubmit = async (data: FormValues) => {
    if (!match || !id) return;
    
    // Check if the match is already full
    if (match.players.length >= match.total_slots) {
      toast({
        title: "Match is full",
        description: "Sorry, all spots for this match have been filled.",
        variant: "destructive",
      });
      return;
    }
    
    setJoining(true);
    
    try {
      // Add player to the match
      const { error } = await supabase
        .from("players")
        .insert({
          match_id: id,
          player_name: data.player_name,
          payment_status: match.is_paid ? "pending" : "not_required",
        });

      if (error) throw error;

      // Success! Show toast and navigate to the match detail page
      toast({
        title: "Success!",
        description: "You have joined the match successfully.",
      });

      // Navigate back to the match detail page
      navigate(`/match/${id}`);
    } catch (error) {
      console.error("Error joining match:", error);
      toast({
        title: "Error",
        description: "Failed to join the match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!match) {
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

  const isFull = match.players.length >= match.total_slots;

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
        
        <h1 className="text-2xl font-bold mb-2">Join: {match.title}</h1>
        
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{formatDate(match.match_date)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{formatTime(match.match_time)}</span>
            </div>
            
            {match.venue && (
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>{match.venue.name}, {match.venue.city}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users size={18} />
              <span className={isFull ? "text-red-500 font-medium" : ""}>
                {match.players.length}/{match.total_slots} spots filled
                {isFull && " (FULL)"}
              </span>
            </div>
            
            {match.is_paid && (
              <div className="font-semibold mt-2">
                Price: ₦{match.price?.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        
        {isFull ? (
          <div className="text-center py-4">
            <h2 className="text-xl text-red-500 font-semibold mb-2">Match is Full</h2>
            <p className="text-muted-foreground mb-4">
              Sorry, all spots for this match have been filled.
            </p>
            <Button onClick={() => navigate(`/match/${match.id}`)}>
              View Match Details
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="player_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your name will be visible to other players
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {match.is_paid && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 dark:border-yellow-900/50 p-3">
                  <p className="text-sm">
                    <strong>Note:</strong> This is a paid match. You will need to pay ₦{match.price?.toFixed(2)} to the organizer.
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={joining || isFull}
              >
                {joining ? "Joining..." : "Join Match"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
};

export default JoinMatch;
