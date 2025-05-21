import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Clock, MapPin } from "lucide-react";
import { isPast, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useDrag, useDrop } from "react-dnd";

// Types
type Player = { id: string; player_name: string };
type Team = {
  name: string;
  players: string[];
  score: number;
  analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number };
};
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string; venue: string };

// Utility function for generating a random emoji
const getRandomAvatar = (playerId: string) => {
  const emojis = ["⚽", "🏀", "🏈", "🎾", "🏐", "🏉", "🥊", "🏓", "🏸", "🤾"];
  const seed = playerId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return emojis[seed % emojis.length];
};

// Player Card Component
const PlayerCard = ({ playerId, teamName, players }: { playerId: string; teamName: string; players: Player[] }) => {
  const player = players.find((p) => p.id === playerId) || { id: playerId, player_name: "Unknown Player" };
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { playerId, teamName },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      className={`p-3 mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center space-x-3 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <span className="text-2xl">{getRandomAvatar(player.id)}</span>
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{player.player_name}</p>
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
        const allPlayers = prev.flatMap((t) => t.players);
        if (allPlayers.includes(item.playerId)) return prev;
        return prev.map((t) => {
          if (t.name === team.name) return { ...t, players: [...t.players, item.playerId] };
          if (t.name === item.teamName) return { ...t, players: t.players.filter((id) => id !== item.playerId) };
          return t;
        });
      });
    },
  }));

  return (
    <div ref={drop} className="flex-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{team.name}</h3>
      {team.players.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No players assigned</p>
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
      toast({ title: "Action Not Available", description: "Cannot manage teams for a past match.", variant: "destructive" });
      return;
    }
    if (numTeams < 2 || numTeams > 10) {
      toast({ title: "Invalid Input", description: "Number of teams must be between 2 and 10.", variant: "destructive" });
      return;
    }
    const shuffled = [...players].sort(() => Math.random() - 0.5);
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
    toast({ title: "Teams Generated", description: `${numTeams} teams have been randomly assigned.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-xl max-w-md">
        <DialogTitle>Generate Teams</DialogTitle>
        <DialogDescription>
          <p className="mb-4 text-xs sm:text-sm">Set the number of teams and players per team.</p>
          <div className="mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Number of Teams (2-10)</label>
            <Input
              type="number"
              value={numTeams}
              onChange={(e) => setNumTeams(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
              min="2"
              max="10"
              className="mt-1 text-xs sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Players per Team</label>
            <Input
              type="number"
              value={playersPerTeam}
              onChange={(e) => setPlayersPerTeam(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
              min="1"
              max="20"
              className="mt-1 text-xs sm:text-sm"
            />
          </div>
          <Button
            onClick={generateTeams}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm"
            disabled={isMatchPast}
          >
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
      toast({ title: "Error", description: "Please select a rule template.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("matches")
        .update({ rules: ruleTemplates[selectedRule as keyof typeof ruleTemplates] })
        .eq("id", matchId);
      if (error) throw error;
      toast({ title: "Success", description: "Rule template applied." });
      onClose();
    } catch (error) {
      console.error("Error applying rule:", error);
      toast({ title: "Error", description: "Failed to apply rule template.", variant: "destructive" });
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
            className="w-full p-2 mb-4 border rounded text-xs sm:text-sm"
          >
            <option value="">Select a rule template</option>
            {Object.keys(ruleTemplates).map((rule) => (
              <option key={rule} value={rule}>{rule}</option>
            ))}
          </select>
          <Button onClick={applyRule} className="w-full bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm">
            Apply Rule
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

const TeamMatchDetails = ({
  match,
  teams,
  setTeams,
  players,
  mode,
  setMode,
  isPublic,
  setIsPublic,
  history,
  historyIndex,
  addToHistory,
  setHistoryIndex,
}: {
  match: Match;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  players: Player[];
  mode: "automatic" | "manual";
  setMode: (mode: "automatic" | "manual") => void;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
  history: Team[][];
  historyIndex: number;
  addToHistory: (teams: Team[]) => void;
  setHistoryIndex: (index: number) => void;
}) => {
  const { toast } = useToast();
  const [teamSelectionOpen, setTeamSelectionOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const [teamNames, setTeamNames] = useState(teams.map((t) => t.name));
  const [inputValues, setInputValues] = useState(teams.map((t) => t.name));

  const handleRenameTeam = (index: number, newName: string) => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Team name cannot be empty.", variant: "destructive" });
      return;
    }
    const newTeamNames = [...teamNames];
    newTeamNames[index] = newName.trim();
    setTeamNames(newTeamNames);
    setInputValues((prev) => {
      const newValues = [...prev];
      newValues[index] = newName.trim();
      return newValues;
    });

    const updatedTeams = teams.map((t, i) => (i === index ? { ...t, name: newName.trim() } : t));
    setTeams(updatedTeams);
    addToHistory(updatedTeams);
  };

  const handleInputChange = (index: number, value: string) => {
    setInputValues((prev) => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });
  };

  const handleInputBlur = (index: number) => {
    handleRenameTeam(index, inputValues[index]);
  };

  const handleInputKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRenameTeam(index, inputValues[index]);
    }
  };

  const togglePrivacy = async () => {
    setIsPublic((prev) => !prev);
    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("match_id", match.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const { error } = existingAssignment
        ? await supabase.from("team_assignments").update({ is_public: !isPublic }).eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert({ is_public: !isPublic, match_id: match.id, super_code: match.super_code, teams });

      if (error) throw error;
      toast({ title: "Success", description: `Match is now ${!isPublic ? "public" : "private"}.` });
    } catch (error) {
      console.error("Error updating privacy:", error);
      toast({ title: "Error", description: "Failed to update match privacy.", variant: "destructive" });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setTeams(history[historyIndex - 1]);
      setTeamNames(history[historyIndex - 1].map((t) => t.name));
      setInputValues(history[historyIndex - 1].map((t) => t.name));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setTeams(history[historyIndex + 1]);
      setTeamNames(history[historyIndex + 1].map((t) => t.name));
      setInputValues(history[historyIndex + 1].map((t) => t.name));
    }
  };

  const saveTeams = async () => {
    const allPlayers = teams.flatMap((t) => t.players);
    if (new Set(allPlayers).size !== allPlayers.length) {
      toast({ title: "Error", description: "A player cannot be assigned to multiple teams.", variant: "destructive" });
      return;
    }

    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("match_id", match.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const teamAssignmentData = { match_id: match.id, super_code: match.super_code, teams, is_public: isPublic };
      const { error } = existingAssignment
        ? await supabase.from("team_assignments").update(teamAssignmentData).eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert(teamAssignmentData);

      if (error) throw error;
      toast({ title: "Teams Saved", description: "Team assignments and analytics have been updated." });
    } catch (error) {
      console.error("Error saving teams:", error);
      toast({ title: "Error", description: "Failed to save teams.", variant: "destructive" });
    }
  };

  const formattedTime = format(new Date(`1970-01-01T${match.match_time}`), "h:mm a");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{match.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-green-500" />
            <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">Teams: {teams.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-green-500" />
            <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">{match.match_date} {formattedTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-green-500" />
            <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">{match.venue || "Venue TBD"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setMode(mode === "automatic" ? "manual" : "automatic")}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            {mode === "automatic" ? "Manual Mode" : "Automatic Mode"}
          </Button>
          <Button
            onClick={() => setTeamSelectionOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            Regenerate Teams
          </Button>
          <TeamSelectionDialog
            players={players}
            teams={teams}
            setTeams={(newTeams) => {
              setTeams(newTeams);
              setTeamNames(newTeams.map((t) => t.name));
              setInputValues(newTeams.map((t) => t.name));
              addToHistory(newTeams);
            }}
            isOpen={teamSelectionOpen}
            onClose={() => setTeamSelectionOpen(false)}
            matchDate={match.match_date}
            matchTime={match.match_time}
          />
          <Button
            onClick={saveTeams}
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            Save Teams
          </Button>
          <Button
            onClick={() => setRulesTemplateOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            Apply Rules
          </Button>
          <RulesTemplateDialog
            isOpen={rulesTemplateOpen}
            onClose={() => setRulesTemplateOpen(false)}
            matchId={match.id}
          />
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            Undo
          </Button>
          <Button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          >
            Redo
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Switch checked={isPublic} onCheckedChange={togglePrivacy} />
        <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">Public Match</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {teams.map((team, index) => (
          <div key={team.name} className="flex-1">
            <div className="mb-2">
              <Input
                value={inputValues[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onBlur={() => handleInputBlur(index)}
                onKeyDown={(e) => handleInputKeyDown(index, e)}
                placeholder="Team Name"
                className="text-xs sm:text-sm"
              />
            </div>
            <TeamColumn team={team} setTeams={setTeams} players={players} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamMatchDetails;
