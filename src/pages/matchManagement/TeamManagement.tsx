import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import Navbar from "@/components/Navbar";
import MatchReport from "@/components/match/MatchReport";
import TeamMatchDetails from "@/components/match/TeamMatchDetails";

import { BackButton, EmptyState, ScButton, Segmented } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
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
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string; venue: string };

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
  const [section, setSection] = useState<"teams" | "score">("teams");

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
              id, slug, super_code, title, match_date::text, match_time, venue,
              venue_info:venues(name, city),
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
        setMatch({ 
          id: match.id, 
          slug: match.slug, 
          super_code: match.super_code, 
          title: match.title, 
          match_date: match.match_date, 
          match_time: match.match_time,
          venue: match.venue_info?.name
            ? `${match.venue_info.name}${match.venue_info.city ? `, ${match.venue_info.city}` : ""}`
            : typeof match.venue === "string" && match.venue
              ? match.venue
              : typeof match.venue === "object" && match.venue?.name
                ? match.venue.name
                : "Venue not set",
        });

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
          await saveTeams(newTeams, match.id, match.super_code, teamAssignment.is_public || false);
          toast({ title: "Teams Auto-Assigned", description: "Teams have been randomly assigned." });
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({ title: "Could not load the match", description: "Check your connection and try again.", variant: "destructive" });
        navigate(-1);
      }
    };

    fetchMatch();
  }, [slug, toast, navigate]);

  useEffect(() => {
    if (!match) return;

    const teamSubscription = supabase
      .channel(`team_assignments:${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'team_assignments', filter: `match_id=eq.${match.id}` },
        (payload) => {
          setTeams(payload.new.teams);
          setIsPublic(payload.new.is_public);
        }
      )
      .subscribe();

    const eventSubscription = supabase
      .channel(`match_events:${match.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${match.id}` },
        (payload) => {
          setEvents((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamSubscription);
      supabase.removeChannel(eventSubscription);
    };
  }, [match]);

  const saveTeams = async (teamsToSave: Team[], matchId: string, superCode: string, publicStatus: boolean) => {
    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("match_id", matchId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const teamAssignmentData = { match_id: matchId, super_code: superCode, teams: teamsToSave, is_public: publicStatus };
      const { error } = existingAssignment
        ? await supabase.from("team_assignments").update(teamAssignmentData).eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert(teamAssignmentData);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving teams:", error);
      toast({ title: "Error", description: "Failed to save teams.", variant: "destructive" });
    }
  };

  const handleVerifySupercode = async () => {
    if (!match) return;
    try {
      // The code must belong to this match, not just any match
      if (supercodeInput.trim() !== String(match.super_code)) {
        toast({ title: "Wrong super code", description: "That code is not for this match.", variant: "destructive" });
        return;
      }
      setIsVerified(true);
      setVerificationOpen(false);
      toast({ title: "Unlocked", description: "Set the teams and keep score." });
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
    if (match) {
      saveTeams(newTeams, match.id, match.super_code, isPublic);
    }
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-sc-bg px-5 pt-20"><RowsSkeleton rows={4} /></div>
    );
  }

  return (
    <DndProvider backend={typeof window !== "undefined" && "ontouchstart" in window ? TouchBackend : HTML5Backend}>
      <div className="min-h-screen bg-sc-bg dark:bg-gray-900 pb-24">
        <header className="sticky top-0 z-30 bg-sc-bg/95 backdrop-blur-xl px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Teams and score</h1>
            <div className="min-w-11" />
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-2 pb-8">
          <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
            <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[380px] rounded-[28px] bg-white p-6 flex flex-col items-center text-center gap-3">
              <span className="w-14 h-14 rounded-full bg-sc-ink text-white flex items-center justify-center"><KeyRound size={24} /></span>
              <DialogTitle className="text-xl font-extrabold">Enter your super code</DialogTitle>
              <DialogDescription className="text-sm text-sc-ink2">Only the organiser can manage teams and the score.</DialogDescription>
              <Input
                value={supercodeInput}
                onChange={(e) => setSupercodeInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && supercodeInput.length === 6 && handleVerifySupercode()}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="h-14 text-center text-2xl font-extrabold tracking-[0.4em]"
              />
              <ScButton onClick={handleVerifySupercode} disabled={supercodeInput.length !== 6}>Unlock</ScButton>
            </DialogContent>
          </Dialog>

          {!isVerified && !verificationOpen && (
            <div className="bg-white rounded-3xl mt-4">
              <EmptyState icon={Lock} sport="gray" title="Locked" subtitle="Enter the super code for this match to manage teams and the score." action={<ScButton size="sm" full={false} kind="dark" onClick={() => setVerificationOpen(true)}>Enter code</ScButton>} />
            </div>
          )}

          {isVerified && (
            <div className="flex flex-col gap-4">
              <div className="sticky top-[calc(max(env(safe-area-inset-top),1rem)+56px)] z-20 bg-sc-bg/95 backdrop-blur-xl -mx-4 px-4 pt-1 pb-3">
                <Segmented
                  value={section}
                  onChange={(v) => setSection(v as "teams" | "score")}
                  options={[{ value: "teams", label: "Teams" }, { value: "score", label: "Score and report" }]}
                />
              </div>
              {section === "teams" ? (
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
              ) : (
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
              )}
            </div>
          )}
        </div>
        <Navbar />
      </div>
    </DndProvider>
  );
};

export default TeamManagement;
