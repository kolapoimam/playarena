import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Twitter,
  Facebook,
  MessageCircle,
  Copy,
} from "lucide-react";

type MatchHighlight = {
  match_id: string;
  title: string;
  match_date: string;
  match_time: string;
  venue?: string;
  teams: {
    name: string;
    score: number;
    analytics: {
      possession: number;
      shots: number;
      fouls: number;
      yellow_cards: number;
      red_cards: number;
    };
  }[];
  events: {
    id: string;
    type: string;
    team_name: string;
    minute: number;
    description: string;
  }[];
};

const Navbar = lazy(() => import("@/components/Navbar"));

const MatchHighlights = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [highlight, setHighlight] = useState<MatchHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlight = async () => {
      if (!slug) {
        toast({
          title: "Error",
          description: "Invalid share link.",
          variant: "destructive",
        });
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
          toast({
            title: "Error",
            description: "Match highlights not found or not public.",
            variant: "destructive",
          });
          return;
        }

        // Type cast the JSON data properly
        const highlightData = data[0] as any;
        setHighlight({
          match_id: highlightData.match_id,
          title: highlightData.title,
          match_date: highlightData.match_date,
          match_time: highlightData.match_time,
          venue: highlightData.venue,
          teams: Array.isArray(highlightData.teams) ? highlightData.teams : [],
          events: Array.isArray(highlightData.events) ? highlightData.events : []
        });
      } catch (error) {
        console.error("Error fetching highlights:", error);
        toast({
          title: "Error",
          description: "Failed to load match highlights.",
          variant: "destructive",
        });
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
        <div className="text-xl font-semibold text-gray-800">
          No highlights available.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-24">
      {/* Header */}
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
          <h1 className="text-xl sm:text-2xl font-bold">Match Highlights</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Match Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Match Title */}
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600 dark:text-green-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 21h10M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  TITLE
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {highlight.title}
                </p>
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-600 dark:text-blue-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  VENUE
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {highlight.venue || "Venue TBD"}
                </p>
              </div>
            </div>

            {/* Match Date */}
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600 dark:text-purple-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  DATE
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {highlight.match_date}
                </p>
              </div>
            </div>

            {/* Match Time */}
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-600 dark:text-amber-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  TIME
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {highlight.match_time}
                </p>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {highlight.teams[0]?.name || "Team 1"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {highlight.teams[0]?.score || 0}
              </p>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              -
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {highlight.teams[1]?.name || "Team 2"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {highlight.teams[1]?.score || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Teams
            </h2>
            <div className="space-y-4">
              {highlight.teams.map((team, index) => (
                <div
                  key={team.name}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                      {team.name}
                    </h3>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {team.score}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Possession: {team.analytics.possession}%
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Shots: {team.analytics.shots}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Fouls: {team.analytics.fouls}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Yellow Cards: {team.analytics.yellow_cards}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Red Cards: {team.analytics.red_cards}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Spread the Word
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enjoyed this match? Let your friends catch the action too — share
              the highlights!
            </p>
            <div className="flex justify-center gap-4">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  `${window.location.origin}/highlights/${highlight.match_id}`
                )}&text=Don't miss this thrilling highlight on SportCliq!`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="p-2">
                  <Twitter size={20} className="text-blue-400" />
                </Button>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  `${window.location.origin}/highlights/${highlight.match_id}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="p-2">
                  <Facebook size={20} className="text-blue-600" />
                </Button>
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=Check out this amazing match highlight on SportCliq! ${encodeURIComponent(
                  `${window.location.origin}/highlights/${highlight.match_id}`
                )}`}
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
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/highlights/${highlight.match_id}`
                    );
                    toast({
                      title: "Copied!",
                      description: "Highlight link is ready to share.",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Couldn't copy the link.",
                      variant: "destructive",
                    });
                  }
                }}
                className="p-2"
              >
                <Copy size={20} className="text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
};

export default MatchHighlights;
