import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  total_slots: number;
  organizer_name: string;
  is_paid: boolean;
  price: number | null;
  player_number_required: boolean;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

// Define the form schema
const formSchema = z.object({
  player_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  player_number: z.string().optional(),
});

const JoinMatch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      player_name: "",
      player_number: "",
    },
  });

  useEffect(() => {
    if (!slug) return;

    const fetchMatch = async () => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select(`
            id, slug, title, match_date, total_slots, organizer_name, is_paid, price, player_number_required,
            venue:venues(slug, name, city),
            players(*)
          `)
          .eq("slug", slug)
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
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [slug, toast]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!match || !slug) return;

    // Check if match is already full
    if (match.players.length >= match.total_slots) {
      toast({
        title: "Match is full",
        description: "Sorry, this match has reached its player limit.",
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
          match_id: match.id,
          player_name: match.player_number_required && data.player_number
            ? `${data.player_name} (#${data.player_number})`
            : data.player_name,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You have joined the match successfully.",
      });

      // Navigate to the match detail
      navigate(`/match/${match.slug}`);
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

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
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

  // Check if match is already full
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

        <h1 className="text-2xl font-bold mb-2">Join Match</h1>
        <div className="mb-6">
          <h2 className="font-semibold text-xl">{match.title}</h2>
          <p className="text-muted-foreground">
            {formatDate(match.match_date)} · {match.venue?.name}, {match.venue?.city}
          </p>
          <p className="mt-2">
            Spots available: {match.total_slots - match.players.length} / {match.total_slots}
          </p>
          {match.is_paid && (
            <p className="font-medium mt-2">
              Price: ₦{match.price?.toFixed(2)}
            </p>
          )}
        </div>

        {isFull ? (
          <div className="text-center py-6 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold">This match is full</h2>
            <p className="text-muted-foreground mt-2">All player slots have been filled.</p>
            <Button
              className="mt-4"
              onClick={() => navigate(`/match/${match.slug}`)}
            >
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {match.player_number_required && (
                <FormField
                  control={form.control}
                  name="player_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jersey Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter your jersey number"
                          min={1}
                          max={99}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This match requires players to provide their jersey number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={joining}
              >
                {joining ? "Joining..." : "Join Match"}
              </Button>
            </form>
          </Form>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default JoinMatch;
