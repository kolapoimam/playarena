import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import Navbar from "@/components/Navbar";
import TeamMatchDetails from "@/components/TeamMatchDetails";
import MatchReport from "@/components/MatchReport";

type Player = { id: string; player_name: string };
type Team = {
  name: string;
  players: string[];
  score: number;
  analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number };
};
type MatchEvent = {
  id: string;
  match_id: string;
  type: "goal" | "yellow_card" | "red_card" | "foul" | "shot" | "substitution";
  team_name: string;
  player_id?: string;
  minute: number;
  description: string;
};
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string };

const fetchWithRetry = async (query: any, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await query;
    } catch (error) {
      if (i < retries - 1) await new Promise((res) => setTimeout(res, delay));
      else throw error;
    }
  }
};

const TeamManagement = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean>(location.state?.isVerified || false);
  const [verificationOpen, setVerificationOpen] = useState(!location.state?.isVerified);
  const [supercodeInput, setSupercodeInput] = useState("");
  const [history, setHistory] = useState<Team[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");

  useEffect(() => {
    const fetchMatch = async () => {
      if (!slug) {
        toast({ title: "Error", description: "No match slug provided.", variant: "destructive" });
        navigate("/matches");
        return;
      }

      try {
        const { data: matchData, error: matchError } = await fetchWithRetry(
          supabase
            .from("matches")
            .select(`
              id, slug, super_code, title, match_date::text, match_time,
              team_assignments!fk_match (id, teams, is_public)
            `)
            .eq("slug", slug)
        );

        if (matchError) throw matchError;
        if (!matchData.length) {
          toast({ title: "Error", description: "No match found for this slug.", variant: "destructive" });
          navigate("/matches");
          return;
        }

        const match = matchData[0];
        setMatch({ id: match.id, slug: match.slug, super_code: match.super_code, title: match.title, match_date: match.match_date, match_time: match.match_time });

        const teamAssignment = match.team_assignments[0] || {};
        const defaultTeams: Team[] = [
          { name: "Team 1", players: [], score: 0, analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 } },
          { name: "Team 2", players: [], score: 0, analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 } },
        ];
        const initialTeams = teamAssignment.teams?.length ? teamAssignment.teams : defaultTeams;
        setTeams(initialTeams);
        setIsPublic(teamAssignment.is_public || false);

        const { data: eventsData, error: eventsError } = await fetchWithRetry(
          supabase.from("match_events").select("*").eq("match_id", match.id).order("created_at", { ascending: true })
        );
        if (eventsError) throw eventsError;
        setEvents(eventsData || []);

        const { data: playersData, error: playersError } = await fetchWithRetry(
          supabase.from("players").select("id, player_name").eq("match_id", match.id)
        );
        if (playersError) throw playersError;
        setPlayers(playersData || []);

        if (!teamAssignment.teams?.length && playersData?.length) {
          const numTeams = 2;
          const playersPerTeam = Math.floor(playersData.length / numTeams);
          const shuffled = [...playersData].sort(() => Math.random() - 0.5);
          const newTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
            name: `Team ${i + 1}`,
            players: [],
            score: 0,
            analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
          }));

          for (let i = 0; i < Math.min(playersPerTeam * numTeams, shuffled.length); i++) {
            newTeams[i % numTeams].players.push(shuffled[i].id);
          }

          setTeams(newTeams);
          addToHistory(newTeams);
          toast({ title: "Teams Auto-Assigned", description: "Teams have been randomly assigned." });
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({ title: "Error", description: "Failed to load match details.", variant: "destructive" });
        navigate("/matches");
      }
    };

    fetchMatch();
  }, [slug, toast, navigate]);

  const handleVerifySupercode = async () => {
    if (!match) return;
    try {
      const { data, error } = await fetchWithRetry(
        supabase.from("matches").select("super_code").eq("super_code", supercodeInput).maybeSingle()
      );
      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid Supercode", description: "No match found with this supercode.", variant: "destructive" });
        return;
      }
      setIsVerified(true);
      setVerificationOpen(false);
      toast({ title: "Access Granted", description: "You can now manage teams and record the match." });
    } catch (error) {
      console.error("Error verifying supercode:", error);
      toast({ title: "Error", description: "Failed to verify supercode.", variant: "destructive" });
    }
  };

  const addToHistory = (newTeams: Team[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTeams);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading match details...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={typeof window !== "undefined" && "ontouchstart" in window ? TouchBackend : HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
          <div className="p-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:text-gray-200">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Team Management</h1>
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
            <DialogContent>
              <DialogTitle>Verify Supercode</DialogTitle>
              <DialogDescription>
                <p className="mb-4">Enter the supercode to manage this match.</p>
                <Input
                  value={supercodeInput}
                  onChange={(e) => setSupercodeInput(e.target.value)}
                  placeholder="Enter supercode"
                  className="mb-4"
                />
                <Button onClick={handleVerifySupercode} className="w-full bg-green-500 hover:bg-green-600 text-white">
                  Verify
                </Button>
              </DialogDescription>
            </DialogContent>
          </Dialog>

          {isVerified && (
            <div className="space-y-6">
              <TeamMatchDetails
                match={match}
                teams={teams}
                setTeams={setTeams}
                players={players}
                mode={mode}
                setMode={setMode}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                history={history}
                historyIndex={historyIndex}
                addToHistory={addToHistory}
                setHistoryIndex={setHistoryIndex}
              />
              <MatchReport
                match={match}
                teams={teams}
                setTeams={setTeams}
                events={events}
                setEvents={setEvents}
                players={players}
                addToHistory={addToHistory}
                isPublic={isPublic}
              />
            </div>
          )}
        </div>
        <Navbar />
      </div>
    </DndProvider>
  );
};

export default TeamManagement;
