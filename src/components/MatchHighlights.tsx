import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home, Trophy, Calendar } from "lucide-react";

type MatchHighlight = {
  match_id: string;
  title: string;
  match_date: string;
  match_time: string;
  teams: { name: string; score: number; analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number } }[];
  events: { id: string; type: string; team_name: string; minute: number; description: string }[];
};

const MatchHighlights = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [highlight, setHighlight] = useState<MatchHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlight = async () => {
      if (!slug) {
        toast({ title: "Error", description: "Invalid share link.", variant: "destructive" });
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc("get_match_highlights_by_slug", { p_slug: slug })
          .select(`
            match_id,
            title,
            match_date::text,
            match_time::text,
            teams,
            events
          `);

        if (error) throw error;
        if (!data || data.length === 0) {
          toast({ title: "Error", description: "Match highlights not found or not public.", variant: "destructive" });
          return;
        }

        setHighlight(data[0]);
      } catch (error) {
        console.error("Error fetching highlights:", error);
        toast({ title: "Error", description: "Failed to load match highlights.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchHighlight();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-xl font-semibold text-gray-800">Loading...</div>
      </div>
    );
  }

  if (!highlight) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-xl font-semibold text-gray-800">No highlights available.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src="/playarenalight.png" alt="PlayArena Logo" className="h-10" />
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center text-gray-700 dark:text-gray-200 hover:text-blue-500">
                <Home size={20} className="mr-2" />
                <span className="text-sm font-medium">Home</span>
              </Link>
              <Link to="/matches" className="flex items-center text-gray-700 dark:text-gray-200 hover:text-blue-500">
                <Calendar size={20} className="mr-2" />
                <span className="text-sm font-medium">Matches</span>
              </Link>
              <Link to="/highlights" className="flex items-center text-gray-700 dark:text-gray-200 hover:text-blue-500">
                <Trophy size={20} className="mr-2" />
                <span className="text-sm font-medium">Highlights</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src="/playarenalight.png" alt="PlayArena Logo" className="w-32 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-800 dark:text-blue-300">{highlight.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {highlight.match_date} at {highlight.match_time}
          </p>
          <div className="mt-4 text-4xl font-bold text-gray-800 dark:text-gray-200">
            {highlight.teams[0].name} {highlight.teams[0].score} - {highlight.teams[1].score} {highlight.teams[1].name}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Teams</h2>
            <div className="space-y-4">
              {highlight.teams.map((team, index) => (
                <div key={team.name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{team.name}</h3>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{team.score}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Possession: {team.analytics.possession}%</p>
                      <p className="text-gray-600 dark:text-gray-400">Shots: {team.analytics.shots}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Fouls: {team.analytics.fouls}</p>
                      <p className="text-gray-600 dark:text-gray-400">Yellow Cards: {team.analytics.yellow_cards}</p>
                      <p className="text-gray-600 dark:text-gray-400">Red Cards: {team.analytics.red_cards}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Events Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Events</h2>
            {highlight.events.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No events recorded.</p>
            ) : (
              <ul className="space-y-3">
                {highlight.events.map((event) => (
                  <li key={event.id} className="flex items-start">
                    <span className="inline-block w-12 text-center font-semibold text-blue-600 dark:text-blue-400">{event.minute}'</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{event.type.replace("_", " ")} ({event.team_name})</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Share Highlights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Share this epic match with your friends!</p>
          <div className="flex justify-center gap-4">
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}&text=Check out this epic match on SportCliq!`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="p-2">
                <Twitter size={20} className="text-blue-400" />
              </Button>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="p-2">
                <Facebook size={20} className="text-blue-600" />
              </Button>
            </a>
            <a href={`https://api.whatsapp.com/send?text=Check out this epic match on SportCliq! ${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="p-2">
                <MessageCircle size={20} className="text-green-500" />
              </Button>
            </a>
            <Button variant="outline" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/highlights/${highlight.match_id}`);
                toast({ title: "Success", description: "Link copied to clipboard!" });
              } catch (error) {
                toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
              }
            }} className="p-2">
              <Copy size={20} className="text-gray-600" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MatchHighlights;
