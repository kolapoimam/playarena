import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Trophy, Clock, Shield, Share2, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { isPast } from "date-fns";

// Types
type Player = {
  id: string;
  name: string;
  avatar?: string;
  skill: number;
  position: string;
};

type Team = {
  name: string;
  players: string[]; // Array of player IDs
  score: number;
  analytics: {
    possession: number;
    shots: number;
    fouls: number;
    yellow_cards: number;
    red_cards: number;
  };
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

type Match = {
  id: string;
  slug: string;
  super_code: string;
  title: string;
  match_date: string;
  match_time: string;
};

type TeamRanking = {
  name: string;
  goals: number;
  points: number; // Based on goals, cards, etc.
  yellow_cards: number;
  red_cards: number;
  fouls: number;
  shots: number;
};

// Utility function for retrying Supabase queries
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

// Player Card Component
const PlayerCard = ({ playerId, teamName, players }: { playerId: string; teamName: string; players: Player[] }) => {
  const player = players.find((p) => p.id === playerId) || {
    id: playerId,
    name: "Unknown Player",
    position: "Unknown",
    skill: 0,
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { playerId, teamName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-3 mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center space-x-3 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <img
        src={player.avatar || "https://via.placeholder.com/40"}
        alt={player.name}
        className="w-10 h-10 rounded-full"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{player.position}</p>
      </div>
      <div className="flex space-x-1">
        {Array.from({ length: player.skill }).map((_, i) => (
          <span key={i} className="text-yellow-400">★</span>
        ))}
      </div>
    </div>
  );
};

// Team Column Component
const TeamColumn = ({
  team,
  setTeams,
  players,
}: {
  team: Team;
  setTeams: (teams: Team[]) => void;
  players: Player[];
}) => {
  const [, drop] = useDrop(() => ({
    accept: "PLAYER",
    drop: (item: { playerId: string; teamName: string }) => {
      setTeams((prev) => {
        if (item.teamName === team.name) return prev;
        // Prevent duplicate player assignments
        const allPlayers = prev.flatMap((t) => t.players);
        if (allPlayers.includes(item.playerId)) {
          return prev; // Player already assigned
        }
        return prev.map((t) => {
          if (t.name === team.name) {
            return { ...t, players: [...t.players, item.playerId] };
          }
          if (t.name === item.teamName) {
            return { ...t, players: t.players.filter((id) => id !== item.playerId) };
          }
          return t;
        });
      });
    },
  }));

  return (
    <div ref={drop} className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{team.name}</h3>
      {team.players.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No players assigned</p>
      ) : (
        team.players.map((playerId) => (
          <PlayerCard key={playerId} playerId={playerId} teamName={team.name} players={players} />
        ))
      )}
    </div>
  );
};

// Team Selection Dialog Component
const TeamSelectionDialog = ({
  players,
  teams,
  setTeams,
  isOpen,
  onClose,
  matchDate,
  matchTime,
}: {
  players: Player[];
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  isOpen: boolean;
  onClose: () => void;
  matchDate: string;
  matchTime: string;
}) => {
  const { toast } = useToast();
  const [numTeams, setNumTeams] = useState(teams.length || 2);
  const [playersPerTeam, setPlayersPerTeam] = useState(Math.floor(players.length / (teams.length || 2)) || 5);
  const now = new Date();
  const matchDateTime = new Date(`${matchDate}T${matchTime}`);
  const isMatchPast = isPast(matchDateTime);

  const generateTeams = () => {
    if (isMatchPast) {
      toast({
        title: "Action Not Available",
        description: "Cannot manage teams for a past match.",
        variant: "destructive",
      });
      return;
    }
    if (numTeams < 2 || numTeams > 10) {
      toast({
        title: "Invalid Input",
        description: "Number of teams must be between 2 and 10.",
        variant: "destructive",
      });
      return;
    }
    const shuffled = [...players].sort(() => Math.random() - 0.5); // Randomize players
    const totalPlayers = Math.min(playersPerTeam * numTeams, shuffled.length);
    const newTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
      name: `Team ${i + 1}`,
      players: [],
      score: 0,
      analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
    }));

    for (let i = 0; i < totalPlayers; i++) {
      newTeams[i % numTeams].players.push(shuffled[i].id);
    }

    setTeams(newTeams);
    onClose();
    toast({
      title: "Teams Generated",
      description: `${numTeams} teams have been randomly assigned.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Generate Teams</DialogTitle>
        <DialogDescription>
          <p className="mb-4">Set the number of teams and players per team.</p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Teams (2-10)</label>
            <Input
              type="number"
              value={numTeams}
              onChange={(e) => setNumTeams(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
              min="2"
              max="10"
              className="mt-1"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Players per Team</label>
            <Input
              type="number"
              value={playersPerTeam}
              onChange={(e) => setPlayersPerTeam(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
              min="1"
              max="20"
              className="mt-1"
            />
          </div>
          <Button onClick={generateTeams} className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={isMatchPast}>
            Generate Teams
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

// Rules Template Dialog Component
const RulesTemplateDialog = ({ isOpen, onClose, matchId }: { isOpen: boolean; onClose: () => void; matchId: string }) => {
  const { toast } = useToast();
  const [selectedRule, setSelectedRule] = useState("");
  const ruleTemplates = {
    "Standard 11v11": "11 players per side, 90-minute match, standard fouls and offsides apply.",
    "5v5 Casual": "5 players per side, 30-minute match, no offsides.",
    "7v7 Youth": "7 players per side, 60-minute match, modified fouls.",
    "10v10 Tournament": "10 players per side, 60-minute match, standard rules.",
  };

  const applyRule = async () => {
    if (!selectedRule) {
      toast({
        title: "Error",
        description: "Please select a rule template.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("matches")
        .update({ rules: ruleTemplates[selectedRule as keyof typeof ruleTemplates] })
        .eq("id", matchId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Rule template applied.",
      });
      onClose();
    } catch (error) {
      console.error("Error applying rule:", error);
      toast({
        title: "Error",
        description: "Failed to apply rule template.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Apply Match Rules</DialogTitle>
        <DialogDescription>
          <select
            value={selectedRule}
            onChange={(e) => setSelectedRule(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
          >
            <option value="">Select a rule template</option>
            {Object.keys(ruleTemplates).map((rule) => (
              <option key={rule} value={rule}>{rule}</option>
            ))}
          </select>
          <Button onClick={applyRule} className="w-full bg-green-500 hover:bg-green-600 text-white">
            Apply Rule
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const TeamManagement = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [supercodeInput, setSupercodeInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(true);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [history, setHistory] = useState<Team[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [teamSelectionOpen, setTeamSelectionOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Auto-generate analytics and rankings
  const generateAnalyticsAndRankings = (events: MatchEvent[], teams: Team[]): { updatedTeams: Team[]; rankings: TeamRanking[] } => {
    const updatedTeams = teams.map((team) => ({
      ...team,
      score: 0,
      analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
    }));

    const teamStats: { [key: string]: TeamRanking } = {};
    teams.forEach((team) => {
      teamStats[team.name] = { name: team.name, goals: 0, points: 0, yellow_cards: 0, red_cards: 0, fouls: 0, shots: 0 };
    });

    let totalActions = 0;
    events.forEach((event) => {
      const team = updatedTeams.find((t) => t.name === event.team_name);
      if (!team || !teamStats[event.team_name]) return;

      if (event.type === "goal") {
        team.score += 1;
        teamStats[event.team_name].goals += 1;
        teamStats[event.team_name].points += 3; // 3 points for a goal
        totalActions += 1;
      } else if (event.type === "yellow_card") {
        team.analytics.yellow_cards += 1;
        teamStats[event.team_name].yellow_cards += 1;
        teamStats[event.team_name].points -= 1; // -1 point for yellow card
        totalActions += 1;
      } else if (event.type === "red_card") {
        team.analytics.red_cards += 1;
        teamStats[event.team_name].red_cards += 1;
        teamStats[event.team_name].points -= 3; // -3 points for red card
        totalActions += 1;
      } else if (event.type === "foul") {
        team.analytics.fouls += 1;
        teamStats[event.team_name].fouls += 1;
        teamStats[event.team_name].points -= 0.5; // -0.5 points for foul
        totalActions += 1;
      } else if (event.type === "shot") {
        team.analytics.shots += 1;
        teamStats[event.team_name].shots += 1;
        totalActions += 1;
      }
    });

    // Calculate possession
    const actionsPerTeam: { [key: string]: number } = {};
    teams.forEach((team) => (actionsPerTeam[team.name] = 0));
    events.forEach((event) => {
      if (["goal", "shot", "foul"].includes(event.type) && actionsPerTeam[event.team_name] !== undefined) {
        actionsPerTeam[event.team_name] += 1;
      }
    });

    const totalTeamActions = Object.values(actionsPerTeam).reduce((sum, val) => sum + val, 0);
    updatedTeams.forEach((team) => {
      if (totalTeamActions > 0) {
        team.analytics.possession = Math.round((actionsPerTeam[team.name] / totalTeamActions) * 100);
      }
    });

    // Generate rankings
    const rankings = Object.values(teamStats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.red_cards - b.red_cards; // Fewer red cards win
    });

    return { updatedTeams, rankings };
  };

  // Fetch match, teams, events, and players
  useEffect(() => {
    const fetchMatch = async () => {
      if (!slug) {
        toast({
          title: "Error",
          description: "No match slug provided.",
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      try {
        const { data: matchData, error: matchError } = await fetchWithRetry(
          supabase
            .from("matches")
            .select(`
              id,
              slug,
              super_code,
              title,
              match_date,
              match_time,
              team_assignments (
                id,
                teams,
                is_public
              )
            `)
            .eq("slug", slug)
        );

        if (matchError) throw matchError;
        if (!matchData.length) {
          toast({
            title: "Error",
            description: "No match found for this slug.",
            variant: "destructive",
          });
          navigate("/matches");
          return;
        }
        if (matchData.length > 1) {
          console.warn("Multiple matches found for slug:", slug);
          // Select the first match; consider adding logic to handle duplicates
        }

        const match = matchData[0];
        setMatch({
          id: match.id,
          slug: match.slug,
          super_code: match.super_code,
          title: match.title,
          match_date: match.match_date,
          match_time: match.match_time,
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
          supabase
            .from("match_events")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at", { ascending: true })
        );

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);

        const { data: playersData, error: playersError } = await fetchWithRetry(
          supabase
            .from("players")
            .select("id, name, avatar, skill, position")
            .eq("match_id", match.id)
        );

        if (playersError) throw playersError;
        setPlayers(playersData || []);

        // Auto-generate teams if none exist
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
          toast({
            title: "Teams Auto-Assigned",
            description: "Teams have been randomly assigned. Click 'Regenerate Teams' to reassign.",
          });
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: "Error",
          description: "Failed to load match details. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
      }
    };

    fetchMatch();
  }, [slug, toast, navigate]);

  // Supercode verification
  const handleVerifySupercode = async () => {
    if (!match) return;
    try {
      const { data, error } = await fetchWithRetry(
        supabase
          .from("matches")
          .select("super_code")
          .eq("super_code", supercodeInput)
          .maybeSingle()
      );
      if (error) throw error;
      if (!data) {
        toast({
          title: "Invalid Supercode",
          description: "No match found with this supercode.",
          variant: "destructive",
        });
        return;
      }
      setIsVerified(true);
      setVerificationOpen(false);
      toast({
        title: "Access Granted",
        description: "You can now manage teams and record the match.",
      });
    } catch (error) {
      console.error("Error verifying supercode:", error);
      toast({
        title: "Error",
        description: "Failed to verify supercode.",
        variant: "destructive",
      });
    }
  };

  // Undo/Redo functionality
  const addToHistory = (newTeams: Team[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTeams);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setTeams(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setTeams(history[historyIndex + 1]);
    }
  };

  // Save teams to Supabase
  const saveTeams = async () => {
    if (!match) return;

    // Validate no duplicate players
    const allPlayers = teams.flatMap((t) => t.players);
    if (new Set(allPlayers).size !== allPlayers.length) {
      toast({
        title: "Error",
        description: "A player cannot be assigned to multiple teams.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existingAssignment, error: fetchError } = await fetchWithRetry(
        supabase
          .from("team_assignments")
          .select("id")
          .eq("match_id", match.id)
          .maybeSingle()
      );

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const teamAssignmentData = {
        match_id: match.id,
        super_code: match.super_code,
        teams,
        is_public,
      };

      const { error } = existingAssignment
        ? await supabase
            .from("team_assignments")
            .update(teamAssignmentData)
            .eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert(teamAssignmentData);

      if (error) throw error;

      toast({
        title: "Teams Saved",
        description: "Team assignments and analytics have been updated.",
      });
    } catch (error) {
      console.error("Error saving teams:", error);
      toast({
        title: "Error",
        description: "Failed to save teams.",
        variant: "destructive",
      });
    }
  };

  // Handle score change
  const handleScoreChange = async (teamName: string, value: string) => {
    if (!/^\d+$/.test(value) || parseInt(value) >= 30) {
      toast({
        title: "Invalid Score",
        description: "Score must be a number less than 30.",
        variant: "destructive",
      });
      return;
    }

    const score = parseInt(value);
    const updatedTeams = teams.map((t) => (t.name === teamName ? { ...t, score } : t));
    setTeams(updatedTeams);
    addToHistory(updatedTeams);
    await saveTeams();
  };

  // Add match event
  const addEvent = async (type: MatchEvent["type"], teamName: string, description: string) => {
    if (!match) return;

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      match_id: match.id,
      type,
      team_name: teamName,
      minute: Math.floor(Date.now() / 60000) % 90,
      description,
    };

    try {
      const { error } = await supabase.from("match_events").insert(newEvent);
      if (error) throw error;

      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      const { updatedTeams } = generateAnalyticsAndRankings(updatedEvents, teams);
      setTeams(updatedTeams);
      await saveTeams();
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Error",
        description: "Failed to add event.",
        variant: "destructive",
      });
    }
  };

  // Update analytics manually
  const updateAnalytics = async (teamName: string, field: keyof Team["analytics"], value: number) => {
    const updatedTeams = teams.map((t) =>
      t.name === teamName ? { ...t, analytics: { ...t.analytics, [field]: value } } : t
    );
    setTeams(updatedTeams);
    addToHistory(updatedTeams);
    await saveTeams();
  };

  // Toggle privacy
  const togglePrivacy = async () => {
    setIsPublic((prev) => !prev);
    if (match) {
      try {
        const { data: existingAssignment, error: fetchError } = await fetchWithRetry(
          supabase
            .from("team_assignments")
            .select("id")
            .eq("match_id", match.id)
            .maybeSingle()
        );

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        const { error } = existingAssignment
          ? await supabase
              .from("team_assignments")
              .update({ is_public: !isPublic })
              .eq("id", existingAssignment.id)
          : await supabase
              .from("team_assignments")
              .insert({ is_public: !isPublic, match_id: match.id, super_code: match.super_code, teams });

        if (error) throw error;
        toast({
          title: "Success",
          description: `Match is now ${!isPublic ? "public" : "private"}.`,
        });
      } catch (error) {
        console.error("Error updating privacy:", error);
        toast({
          title: "Error",
          description: "Failed to update match privacy.",
          variant: "destructive",
        });
      }
    }
  };

  // Export report
  const exportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `match-report-${match?.slug}.png`;
      link.click();
      toast({
        title: "Success",
        description: "Match report exported as PNG.",
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Error",
        description: "Failed to export match report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading match details...</p>
      </div>
    );
  }

  const { rankings } = generateAnalyticsAndRankings(events, teams);

  return (
    <DndProvider backend={typeof window !== "undefined" && "ontouchstart" in window ? TouchBackend : HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
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
            <h1 className="text-2xl font-bold">Team Management</h1>
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6">
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{match.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Trophy size={20} className="text-green-500" />
                    <span className="text-gray-900 dark:text-gray-100">Teams: {teams.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-green-500" />
                    <span className="text-gray-900 dark:text-gray-100">{match.match_date} {match.match_time}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => setMode(mode === "automatic" ? "manual" : "automatic")}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {mode === "automatic" ? "Manual Mode" : "Automatic Mode"}
                  </Button>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setTeamSelectionOpen(true)}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Regenerate Teams
                    </Button>
                  </DialogTrigger>
                  <TeamSelectionDialog
                    players={players}
                    teams={teams}
                    setTeams={(newTeams) => {
                      setTeams(newTeams);
                      addToHistory(newTeams);
                    }}
                    isOpen={teamSelectionOpen}
                    onClose={() => setTeamSelectionOpen(false)}
                    matchDate={match.match_date}
                    matchTime={match.match_time}
                  />
                  <Button
                    onClick={saveTeams}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Save Teams
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Undo
                  </Button>
                  <Button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Redo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {teams.map((team) => (
                  <TeamColumn
                    key={team.name}
                    team={team}
                    setTeams={(newTeams) => {
                      setTeams(newTeams);
                      addToHistory(newTeams);
                    }}
                    players={players}
                  />
                ))}
              </div>

              <div ref={reportRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Match Report</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Score Table</h3>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="p-2 text-gray-900 dark:text-gray-100">Team</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Score</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Possession</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Shots</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Fouls</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Yellow Cards</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Red Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team) => (
                          <tr key={team.name} className="border-b dark:border-gray-600">
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.name}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={team.score}
                                onChange={(e) => handleScoreChange(team.name, e.target.value)}
                                className="w-20"
                                min="0"
                                max="29"
                              />
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.possession}%</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.shots}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.fouls}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.yellow_cards}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.red_cards}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Rankings</h3>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="p-2 text-gray-900 dark:text-gray-100">Rank</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Team</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Points</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Goals</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Yellow Cards</th>
                          <th className="p-2 text-gray-900 dark:text-gray-100">Red Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((team, index) => (
                          <tr key={team.name} className="border-b dark:border-gray-600">
                            <td className="p-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.name}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.points}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.goals}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.yellow_cards}</td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">{team.red_cards}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Events</h3>
                    {events.map((event) => (
                      <p key={event.id} className="text-gray-600 dark:text-gray-400">
                        {event.minute}' - {event.type.replace("_", " ")} ({event.team_name}): {event.description}
                      </p>
                    ))}
                    <div className="flex gap-2 mt-2">
                      {teams.map((team) => (
                        <div key={team.name}>
                          <Button
                            onClick={() => addEvent("goal", team.name, `Goal scored by ${team.name}`)}
                            className="bg-green-500 hover:bg-green-600 text-white mr-2"
                          >
                            Goal ({team.name})
                          </Button>
                          <Button
                            onClick={() => addEvent("yellow_card", team.name, `Yellow card for ${team.name}`)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white mr-2"
                          >
                            Yellow Card
                          </Button>
                          <Button
                            onClick={() => addEvent("red_card", team.name, `Red card for ${team.name}`)}
                            className="bg-red-500 hover:bg-red-600 text-white mr-2"
                          >
                            Red Card
                          </Button>
                          <Button
                            onClick={() => addEvent("foul", team.name, `Foul by ${team.name}`)}
                            className="bg-gray-500 hover:bg-gray-600 text-white mr-2"
                          >
                            Foul
                          </Button>
                          <Button
                            onClick={() => addEvent("shot", team.name, `Shot by ${team.name}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Shot
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-green-500" />
                  <span className="text-gray-900 dark:text-gray-100">Public Match</span>
                  <Switch checked={isPublic} onCheckedChange={togglePrivacy} />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setRulesTemplateOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Apply Rules
                  </Button>
                  <RulesTemplateDialog
                    isOpen={rulesTemplateOpen}
                    onClose={() => setRulesTemplateOpen(false)}
                    matchId={match.id}
                  />
                  <Button
                    onClick={exportReport}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    disabled={isExporting}
                  >
                    {isExporting ? "Exporting..." : <><Download size={18} className="mr-2" /> Export Report</>}
                  </Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Share2 size={18} className="mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <Navbar />
      </div>
    </DndProvider>
  );
};

export default TeamManagement;
