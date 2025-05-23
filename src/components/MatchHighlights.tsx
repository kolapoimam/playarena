import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home, Trophy, Calendar, Twitter, Facebook, MessageCircle, Copy, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

type MatchHighlight = {
  match_id: string;
  title: string;
  match_date: string;
  match_time: string;
  venue?: string;
  teams: { name: string; score: number; analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number } }[];
  events: { id: string; type: string; team_name: string; minute: number; description: string }[];
};

const MatchHighlights = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [highlight, setHighlight] = useState<MatchHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlight = async () => {
      if (!slug) {
        toast({ title: "Error", description: "Invalid share link.", variant: "destructive" });
        return;
      }

      try {
        // Fetch match details including venue from matches table
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select(`
            id,
            title,
            match_date::text,
            match_time::text,
            venue,
            team_assignments!fk_match (teams),
            match_events (id, type, team_name, minute, description)
          `)
          .eq("slug", slug)
          .eq("team_assignments.is_public", true) // Ensure only public highlights are accessible
          .single();

        if (matchError) throw matchError;
        if (!matchData) {
          toast({ title: "Error", description: "Match highlights not found or not public.", variant: "destructive" });
          return;
        }

        // Map the data to MatchHighlight type
        const highlightData: MatchHighlight = {
          match_id: matchData.id,
          title: matchData.title,
          match_date: matchData.match_date,
          match_time: matchData.match_time,
          venue: matchData.venue,
          teams: matchData.team_assignments?.teams || [],
          events: matchData.match_events || [],
        };

        setHighlight(highlightData);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:text-gray-200">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Match Highlights</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Match Details</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><span className="font-medium">Title:</span> {highlight.title}</p>
            <p><span className="font-medium">Venue:</span> {highlight.venue || "Venue TBD"}</p>
            <p><span className="font-medium">Date:</span> {highlight.match_date}</p>
            <p><span className="font-medium">Time:</span> {highlight.match_time}</p>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {highlight.teams[0]?.name || "Team 1"} {highlight.teams[0]?.score || 0} - {highlight.teams[1]?.score || 0} {highlight.teams[1]?.name || "Team 2"}
            </div>
          </div>
        </div>

        {/* Teams and Events Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Teams</h2>
            <div className="space-y-4">
              {highlight.teams.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No team data available.</p>
              ) : (
                highlight.teams.map((team, index) => (
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
                ))
              )}
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
  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Spread the Word</h2>
  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
    Enjoyed this match? Let your friends catch the action too — share the highlights!
  </p>
  <div className="flex justify-center gap-4">
    <a
      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}&text=Don’t miss this thrilling highlight on SportCliq!`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button variant="outline" className="p-2">
        <Twitter size={20} className="text-blue-400" />
      </Button>
    </a>
    <a
      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button variant="outline" className="p-2">
        <Facebook size={20} className="text-blue-600" />
      </Button>
    </a>
    <a
      href={`https://api.whatsapp.com/send?text=Check out this amazing match highlight on SportCliq! ${encodeURIComponent(`${window.location.origin}/highlights/${highlight.match_id}`)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button variant="outline" className="p-2">
        <MessageCircle size={20} className="text-green-500" />
      </Button>
    </a>
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/highlights/${highlight.match_id}`);
          toast({ title: "Copied!", description: "Highlight link is ready to share." });
        } catch (error) {
          toast({ title: "Error", description: "Couldn't copy the link.", variant: "destructive" });
        }
      }}
      className="p-2"
    >
      <Copy size={20} className="text-gray-600" />
    </Button>
  </div>
</div>
      </main>

      {/* Navbar */}
      <Navbar />
    </div>
  );
};

export default MatchHighlights;
