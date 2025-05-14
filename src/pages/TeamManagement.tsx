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
  skill: number; // 1-5
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
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
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
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
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
          .select("id, slug, super_code, title, teamA, teamB, scoreA, scoreB, events, analytics, is_public, match_date, match_time")
          .eq("slug", slug)
          .single();

        if (error) throw error;

        setMatch(data);
        setTeams({
          teamA: data.teamA || [],
          teamB: data.teamB || [],
        });
        setScoreA(data.scoreA || 0);
        setScoreB(data.scoreB || 0);
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
          teamA: teams.teamA,
          teamB: teams.teamB,
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

  const handleScoreChange = (team: "teamA" | "teamB", value: string) => {
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
      setScoreA(score);
    } else {
      setScoreB(score);
    }

    if (match) {
      supabase
        .from("matches")
        .update({ [`score${team === "teamA" ? "A" : "B"}`]: score })
        .eq("id", match.id);
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
      await supabase
        .from("matches")
        .update({ is_public: !isPublic })
        .eq("id", match.id);
    }
  };

  // Export report
  const handleExport = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.download = `Match-Report-${match?.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({
        title: "Report Exported",
        description: "Match report downloaded as an image.",
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Error",
        description: "Failed to export report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate shareable link
  const handleShare = () => {
    const url = `${window.location.origin}/match/${match?.slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Match URL copied to clipboard.",
    });
  };

  const isMatchPast = match ? isPast(new Date(`${match.match_date}T${match.match_time}`)) : false;

  if (!match) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={typeof window !== "undefined" && "ontouchstart" in window ? TouchBackend : HTML5Backend}>
      <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
          <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              className="text-white hover:bg-green-600 transition-colors"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Team Management</h1>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 max-w-4xl mx-auto space-y-8">
          {/* Supercode Verification */}
          <Dialog open={verificationOpen && !isVerified} onOpenChange={setVerificationOpen}>
            <DialogContent className="sm:max-w-[375px] rounded-2xl">
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Enter Supercode</DialogTitle>
              <DialogDescription>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                  Enter the 6-digit supercode to manage teams and record the match.
                </p>
                <Input
                  value={supercodeInput}
                  onChange={(e) => setSupercodeInput(e.target.value)}
                  placeholder="Enter supercode"
                  className="mb-4"
                />
                <Button
                  onClick={handleVerifySupercode}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Verify
                </Button>
              </DialogDescription>
            </DialogContent>
          </Dialog>

          {isVerified && (
            <>
              {/* Team Distribution Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Team Distribution</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={mode === "manual"}
                      onCheckedChange={() => setMode(mode === "automatic" ? "manual" : "automatic")}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {mode === "automatic" ? "Automatic Mode" : "Manual Mode"}
                    </span>
                  </div>
                  {mode === "automatic" ? (
                    <DialogTrigger asChild>
                      <Button onClick={() => setTeamSelectionOpen(true)} className="bg-green-500 hover:bg-green-600 text-white" disabled={isMatchPast}>
                        Suggest Best Fit
                      </Button>
                    </DialogTrigger>
                  ) : (
                    <div className="flex space-x-2">
                      <Button onClick={handleUndo} disabled={historyIndex <= 0 || isMatchPast} variant="outline">
                        Undo
                      </Button>
                      <Button onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isMatchPast} variant="outline">
                        Redo
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <TeamColumn team="teamA" players={teams.teamA} setTeams={setTeams} label="Team A" />
                  <TeamColumn team="teamB" players={teams.teamB} setTeams={setTeams} label="Team B" />
                </div>
                <Button onClick={saveTeams} className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={isMatchPast}>
                  Save Teams
                </Button>
                <DialogTrigger asChild>
                  <Button onClick={() => setRulesTemplateOpen(true)} className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white" disabled={isMatchPast}>
                    Apply Match Rules
                  </Button>
                </DialogTrigger>
              </div>

              {/* Match Analytics Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Match Analytics</h2>
                {/* Scoreboard */}
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Team A</p>
                    <Input
                      type="number"
                      value={scoreA}
                      onChange={(e) => handleScoreChange("teamA", e.target.value)}
                      className="text-center text-2xl font-bold"
                      disabled={isMatchPast}
                    />
                  </div>
                  <span className="text-xl font-bold text-gray-700 dark:text-gray-300">-</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Team B</p>
                    <Input
                      type="number"
                      value={scoreB}
                      onChange={(e) => handleScoreChange("teamB", e.target.value)}
                      className="text-center text-2xl font-bold"
                      disabled={isMatchPast}
                    />
                  </div>
                </div>
                {/* Event Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => addEvent("goal", "teamA", "Goal by Team A")}
                    variant="outline"
                    className="flex-1"
                    disabled={isMatchPast}
                  >
                    Goal (A)
                  </Button>
                  <Button
                    onClick={() => addEvent("goal", "teamB", "Goal by Team B")}
                    variant="outline"
                    className="flex-1"
                    disabled={isMatchPast}
                  >
                    Goal (B)
                  </Button>
                  <Button
                    onClick={() => addEvent("card", "teamA", "Card for Team A")}
                    variant="outline"
                    className="flex-1"
                    disabled={isMatchPast}
                  >
                    Card (A)
                  </Button>
                  <Button
                    onClick={() => addEvent("card", "teamB", "Card for Team B")}
                    variant="outline"
                    className="flex-1"
                    disabled={isMatchPast}
                  >
                    Card (B)
                  </Button>
                </div>
                {/* Event Timeline */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2 text-sm">
                      <Clock size={16} className="text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {event.minute}' - {event.description}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Stats Dashboard */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Possession</p>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={analytics.teamA.possession}
                        onChange={(e) =>
                          updateAnalytics("teamA", "possession", parseInt(e.target.value))
                        }
                        className="w-20"
                        disabled={isMatchPast}
                      />
                      <span className="text-gray-700 dark:text-gray-300">%</span>
                      <Input
                        type="number"
                        value={analytics.teamB.possession}
                        onChange={(e) =>
                          updateAnalytics("teamB", "possession", parseInt(e.target.value))
                        }
                        className="w-20"
                        disabled={isMatchPast}
                      />
                      <span className="text-gray-700 dark:text-gray-300">%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Shots (Team A)</p>
                      <Input
                        type="number"
                        value={analytics.teamA.shots}
                        onChange={(e) => updateAnalytics("teamA", "shots", parseInt(e.target.value))}
                        className="w-full"
                        disabled={isMatchPast}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Shots (Team B)</p>
                      <Input
                        type="number"
                        value={analytics.teamB.shots}
                        onChange={(e) => updateAnalytics("teamB", "shots", parseInt(e.target.value))}
                        className="w-full"
                        disabled={isMatchPast}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fouls (Team A)</p>
                      <Input
                        type="number"
                        value={analytics.teamA.fouls}
                        onChange={(e) => updateAnalytics("teamA", "fouls", parseInt(e.target.value))}
                        className="w-full"
                        disabled={isMatchPast}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fouls (Team B)</p>
                      <Input
                        type="number"
                        value={analytics.teamB.fouls}
                        onChange={(e) => updateAnalytics("teamB", "fouls", parseInt(e.target.value))}
                        className="w-full"
                        disabled={isMatchPast}
                      />
                    </div>
                  </div>
                </div>
                {/* Privacy Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Results</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Toggle to make match results public
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={togglePrivacy}
                    className="data-[state=checked]:bg-green-500"
                    disabled={isMatchPast}
                  />
                </div>
                {/* Report Export */}
                <div className="space-y-4">
                  <div ref={reportRef} className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <img src="/playarenadark.png" alt="PlayArena Logo" className="h-8 w-auto" />
                      <Trophy className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{match.title}</h2>
                    <p className="text-3xl font-bold text-center mb-4">
                      {scoreA} - {scoreB}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Team A: {teams.teamA.map((p) => p.name).join(", ")}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Team B: {teams.teamB.map((p) => p.name).join(", ")}</span>
                      </div>
                      <div className="flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        <span>Shots: {analytics.teamA.shots} (A) vs {analytics.teamB.shots} (B)</span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        <span>Fouls: {analytics.teamA.fouls} (A) vs {analytics.teamB.fouls} (B)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleExport}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      disabled={isExporting || isMatchPast}
                    >
                      <Download size={16} className="mr-2" />
                      {isExporting ? "Exporting..." : "Export Report"}
                    </Button>
                    <Button
                      onClick={handleShare}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      disabled={isMatchPast}
                    >
                      <Share2 size={16} className="mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
          <TeamSelectionDialog
            players={players}
            teams={teams}
            setTeams={setTeams}
            isOpen={teamSelectionOpen}
            onClose={() => setTeamSelectionOpen(false)}
            matchDate={match?.match_date || ""}
            matchTime={match?.match_time || ""}
          />
          <RulesTemplateDialog
            isOpen={rulesTemplateOpen}
            onClose={() => setRulesTemplateOpen(false)}
            matchId={match?.id || ""}
          />
        </div>
        <Navbar />
      </div>
    </DndProvider>
  );
};

export default TeamManagement;
