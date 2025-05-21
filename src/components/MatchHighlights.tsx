import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
            match_time,
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!highlight) {
    return <div className="min-h-screen flex items-center justify-center">No highlights available.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{highlight.title}</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
          {highlight.match_date} at {highlight.match_time}
        </p>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">Teams</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-2">Team</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">Possession</th>
                    <th className="p-2">Shots</th>
                    <th className="p-2">Fouls</th>
                    <th className="p-2">Yellow Cards</th>
                    <th className="p-2">Red Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {highlight.teams.map((team) => (
                    <tr key={team.name} className="border-b dark:border-gray-600">
                      <td className="p-2">{team.name}</td>
                      <td className="p-2">{team.score}</td>
                      <td className="p-2">{team.analytics.possession}%</td>
                      <td className="p-2">{team.analytics.shots}</td>
                      <td className="p-2">{team.analytics.fouls}</td>
                      <td className="p-2">{team.analytics.yellow_cards}</td>
                      <td className="p-2">{team.analytics.red_cards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">Events</h2>
            {highlight.events.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">No events recorded.</p>
            ) : (
              highlight.events.map((event) => (
                <p key={event.id} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {event.minute}' - {event.type.replace("_", " ")} ({event.team_name}): {event.description}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHighlights;
