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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!highlight) {
    return <div className="min-h-screen flex items-center justify-center">No highlights available.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{highlight.title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {highlight.match_date} at {highlight.match_time}
        </p>
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-800">
            {highlight.teams[0].name} {highlight.teams[0].score} - {highlight.teams[1].score} {highlight.teams[1].name}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Teams</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-3 text-gray-800 font-semibold">Team</th>
                    <th className="p-3 text-gray-800 font-semibold">Score</th>
                    <th className="p-3 text-gray-800 font-semibold">Possession</th>
                    <th className="p-3 text-gray-800 font-semibold">Shots</th>
                    <th className="p-3 text-gray-800 font-semibold">Fouls</th>
                    <th className="p-3 text-gray-800 font-semibold">Yellow</th>
                    <th className="p-3 text-gray-800 font-semibold">Red</th>
                  </tr>
                </thead>
                <tbody>
                  {highlight.teams.map((team, index) => (
                    <tr key={team.name} className="border-b border-gray-200">
                      <td className="p-3 text-gray-800 font-medium">{team.name}</td>
                      <td className="p-3 text-gray-800 text-center">{team.score}</td>
                      <td className="p-3 text-gray-800 text-center">{team.analytics.possession}%</td>
                      <td className="p-3 text-gray-800 text-center">{team.analytics.shots}</td>
                      <td className="p-3 text-gray-800 text-center">{team.analytics.fouls}</td>
                      <td className="p-3 text-gray-800 text-center">{team.analytics.yellow_cards}</td>
                      <td className="p-3 text-gray-800 text-center">{team.analytics.red_cards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Events</h2>
            {highlight.events.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No events recorded.</p>
            ) : (
              <ul className="space-y-2">
                {highlight.events.map((event) => (
                  <li key={event.id} className="text-sm text-gray-600 flex items-center">
                    <span className="inline-block w-12 text-center font-semibold text-blue-600">{event.minute}'</span>
                    <span className="flex-1">{event.type.replace("_", " ")} ({event.team_name}): {event.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHighlights;
