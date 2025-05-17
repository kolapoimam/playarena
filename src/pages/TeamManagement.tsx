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
import { ArrowLeft, Users, Trophy, Clock, Target, Shield, Share2, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { isPast, differenceInMinutes } from "date-fns";

// Types
type Player = {
  id: string;
  name: string;
  avatar?: string;
  skill: number;
  position: string;
};

type Team = Player[];

type MatchEvent = {
  id: string;
  match_id: string;
  type: "goal" | "card" | "substitution";
  team: "teamA" | "teamB";
  player_id?: string;
  minute: number;
  description: string;
};

type MatchAnalytics = {
  teamA: {
    possession: number;
    shots: number;
    fouls: number;
  };
  teamB: {
    possession: number;
    shots: number;
    fouls: number;
  };
};

type Match = {
  id: string;
  slug: string;
  super_code: string;
  title: string;
  teama: Team;
  teamb: Team;
  scorea: number;
  scoreb: number;
  events: MatchEvent[];
  analytics: MatchAnalytics;
  is_public: boolean;
  match_date: string;
  match_time: string;
};

// Player Card Component
const PlayerCard = ({ player, team }: { player: Player; team: string }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { player, team },
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
const TeamColumn = ({ team, players, setTeams, label }: { team: string; players: Team; setTeams: any; label: string }) => {
  const [, drop] = useDrop(() => ({
    accept: "PLAYER",
    drop: (item: { player: Player; team: string }) => {
      setTeams((prev: { teamA: Team; teamB: Team }) => {
        const sourceTeam = item.team;
        const targetTeam = team;
        if (sourceTeam === targetTeam) return prev;

        const newSource = prev[sourceTeam].filter((p) => p.id !== item.player.id);
        const newTarget = [...prev[targetTeam], item.player];

        return {
          ...prev,
          [sourceTeam]: newSource,
          [targetTeam]: newTarget,
        };
      });
    },
  }));

  return (
    <div ref={drop} className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{label}</h3>
      {players.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No players assigned</p>
      ) : (
        players.map((player) => (
          <PlayerCard key={player.id} player={player} team={team} />
        ))
      )}
    </div>
  );
};

// Team Selection Dialog Component
const TeamSelectionDialog = ({ players, teams, setTeams, isOpen, onClose, matchDate, matchTime }: { players: Player[]; teams: { teamA: Team; teamB: Team }; setTeams: any; isOpen: boolean; onClose: () => void; matchDate: string; matchTime: string }) => {
  const { toast } = useToast();
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const now = new Date();
  const matchDateTime = new Date(`${matchDate}T${matchTime}`);
  const isMatchPast = isPast(matchDateTime);

  const balanceTeams = () => {
    if (isMatchPast) {
      toast({
        title: "Action Not Available",
        description: "Cannot manage teams for a past match.",
        variant: "destructive",
      });
      return;
    }
    const sorted = [...players].sort((a, b) => b.skill - a.skill);
    const totalPlayers = Math.min(playersPerTeam * 2, sorted.length);
    const newTeams = { teamA: [], teamB: [] };
    for (let i = 0; i < totalPlayers; i++) {
      if (i < playersPerTeam) newTeams.teamA.push(sorted[i]);
      else newTeams.teamB.push(sorted[i]);
    }
    setTeams(newTeams);
    onClose();
    toast({
      title: "Teams Generated",
      description: "Teams have been automatically assigned.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Generate Teams</DialogTitle>
        <DialogDescription>
          <p className="mb-4">Set the number of players per team and generate balanced teams.</p>
          <Input
            type="number"
            value={playersPerTeam}
            onChange={(e) => setPlayersPerTeam(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
            min="1"
            max="10"
            className="mb-4"
          />
          <Button onClick={balanceTeams} className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={isMatchPast}>
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
      await supabase
        .from("matches")
        .update({ rules: ruleTemplates[selectedRule as keyof typeof ruleTemplates] })
        .eq("id", matchId);
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
  const [teams, setTeams] = useState<{ teamA: Team; teamB: Team }>({ teamA: [], teamB: [] });
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [supercodeInput, setSupercodeInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(true);
  const [scorea, setScorea] = useState(0);
  const [scoreb, setScoreb] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [analytics, setAnalytics] = useState<MatchAnalytics>({
    teamA: { possession: 50, shots: 0, fouls: 0 },
    teamB: { possession: 50, shots: 0, fouls: 0 },
  });
  const [isPublic, setIsPublic] = useState(false);
  const [history, setHistory] = useState<{ teamA: Team; teamB: Team }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [teamSelectionOpen, setTeamSelectionOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch match and players
  useEffect(() => {
    const fetchMatch = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("matches")
          .select("id, slug, super_code, title, teama, teamb, scorea, scoreb, events, analytics, is_public, match_date, match_time")
          .eq("slug", slug)
          .single();

        if (error) throw error;

        setMatch(data);
        setTeams({
          teamA: data.teama || [],
          teamB: data.teamb || [],
        });
        setScorea(data.scorea || 0);
        setScoreb(data.scoreb || 0);
        setEvents(data.events || []);
        setAnalytics(data.analytics || {
          teamA: { possession: 50, shots: 0, fouls: 0 },
          teamB: { possession: 50, shots: 0, fouls: 0 },
        });
        setIsPublic(data.is_public || false);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, avatar, skill, position")
          .eq("match_id", data.id);

        if (playersError) throw playersError;
        setPlayers(playersData || []);
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: "Error",
          description: "Failed to load match details.",
          variant: "destructive",
        });
      }
    };

    fetchMatch();
  }, [slug, toast]);

  // Supercode verification
  const handleVerifySupercode = () => {
    if (supercodeInput === match?.super_code) {
      setIsVerified(true);
      setVerificationOpen(false);
      toast({
        title: "Access Granted",
        description: "You can now manage teams and record the match.",
      });
    } else {
      toast({
        title: "Invalid Supercode",
        description: "Please enter the correct supercode.",
        variant: "destructive",
      });
    }
  };

  // Automatic team balancing
  const balanceTeams = () => {
    const sorted = [...players].sort((a, b) => b.skill - a.skill);
    const newTeams = sorted.reduce(
      (teams, player, i) => {
        teams[i % 2 === 0 ? "teamA" : "teamB"].push(player);
        return teams;
      },
      { teamA: [], teamB: [] } as { teamA: Team; teamB: Team }
    );

    setTeams(newTeams);
    addToHistory(newTeams);
  };

  // Undo/Redo functionality
  const addToHistory = (newTeams: { teamA: Team; teamB: Team }) => {
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

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          teama: teams.teamA,
          teamb: teams.teamB,
        })
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Teams Saved",
        description: "Team assignments have been updated.",
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

  // Score validation and update
  const validateScore = (value: string) => /^\d+$/.test(value) && parseInt(value) < 30;

  const handleScoreChange = async (team: "teamA" | "teamB", value: string) => {
    if (!validateScore(value)) {
      toast({
        title: "Invalid Score",
        description: "Score must be a number less than 30.",
        variant: "destructive",
      });
      return;
    }

    const score = parseInt(value);
    if (team === "teamA") {
      setScorea(score);
    } else {
      setScoreb(score);
    }

    if (match) {
      try {
        const { error } = await supabase
          .from("matches")
          .update({ [team === "teamA" ? "scorea" : "scoreb"]: score })
          .eq("id", match.id);
        if (error) throw error;
      } catch (error) {
        console.error("Error updating score:", error);
        toast({
          title: "Error",
          description: "Failed to update score.",
          variant: "destructive",
        });
      }
    }
  };

  // Add match event
  const addEvent = (type: MatchEvent["type"], team: "teamA" | "teamB", description: string) => {
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2),
      match_id: match?.id || "",
      type,
      team,
      minute: Math.floor(Date.now() / 60000) % 90,
      description,
    };

    setEvents((prev) => [...prev, newEvent]);

    if (match) {
      supabase.from("match_events").insert(newEvent);
    }
  };

  // Update analytics
  const updateAnalytics = (team: "teamA" | "teamB", field: keyof MatchAnalytics["teamA"], value: number) => {
    setAnalytics((prev) => ({
      ...prev,
      [team]: {
        ...prev[team],
        [field]: value,
      },
    }));

    if (match) {
      supabase
        .from("matches")
        .update({ analytics })
        .eq("id", match.id);
    }
  };

  // Toggle privacy
  const togglePrivacy = async () => {
    setIsPublic((prev) => !prev);
    if (match) {
      try {
        await supabase
          .from("matches")
          .update({ is_public: !isPublic })
          .eq("id", match.id);
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
                    <span className="text-gray-900 dark:text-gray-100">Score: {scorea} - {scoreb}</span>
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
                      Generate Teams
                    </Button>
                  </DialogTrigger>
                  <TeamSelectionDialog
                    players={players}
                    teams={teams}
                    setTeams={setTeams}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamColumn
                  team="teamA"
                  players={teams.teamA}
                  setTeams={setTeams}
                  label="Team A"
                />
                <TeamColumn
                  team="teamB"
                  players={teams.teamB}
                  setTeams={setTeams}
                  label="Team B"
                />
              </div>

              <div ref={reportRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Match Report</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Score</h3>
                    <div className="flex gap-4">
                      <Input
                        type="number"
                        value={scorea}
                        onChange={(e) => handleScoreChange("teamA", e.target.value)}
                        className="w-20"
                        min="0"
                        max="29"
                      />
                      <span className="text-gray-900 dark:text-gray-100">-</span>
                      <Input
                        type="number"
                        value={scoreb}
                        onChange={(e) => handleScoreChange("teamB", e.target.value)}
                        className="w-20"
                        min="0"
                        max="29"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Events</h3>
                    {events.map((event) => (
                      <p key={event.id} className="text-gray-600 dark:text-gray-400">
                        {event.minute}' - {event.type} ({event.team}): {event.description}
                      </p>
                    ))}
                    <Button
                      onClick={() => addEvent("goal", "teamA", "Goal scored")}
                      className="mt-2 bg-green-500 hover:bg-green-600 text-white"
                    >
                      Add Goal (Team A)
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Team A Possession: {analytics.teamA.possession}%</p>
                        <Input
                          type="number"
                          value={analytics.teamA.possession}
                          onChange={(e) => updateAnalytics("teamA", "possession", parseInt(e.target.value))}
                          className="w-20"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Team B Possession: {analytics.teamB.possession}%</p>
                        <Input
                          type="number"
                          value={analytics.teamB.possession}
                          onChange={(e) => updateAnalytics("teamB", "possession", parseInt(e.target.value))}
                          className="w-20"
                          min="0"
                          max="100"
                        />
                      </div>
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
