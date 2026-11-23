import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { addHours } from "date-fns";

type Player = {
  player_name: string;
  player_status: 'Registered' | 'Checked In' | 'Absent';
  number_of_slots: number;
};

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  sell_tickets: boolean;
  ticket_price: number | null;
  max_tickets: number | null;
  players: Player[];
};

interface PlayersTableProps {
  match: Match;
}

const formatStatus = (status: string) => {
  return status.toLowerCase() === 'absent' ? 'No Show' : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "registered":
      return "bg-yellow-500 text-white border-yellow-600";
    case "checked in":
      return "bg-green-500 text-white border-sc-green";
    case "absent":
      return "bg-red-500 text-white border-red-600";
    default:
      return "bg-gray-500 text-white border-gray-600";
  }
};

const PlayersTable: React.FC<PlayersTableProps> = ({ match }) => {
  const navigate = useNavigate();
  
  const getMatchStatus = () => {
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const matchEndTime = addHours(matchDateTime, 2); // Match duration is 2 hours
    const now = new Date(); // Use current date instead of hardcoded date
    
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const isFull = totalPlayerSlots >= match.total_slots;
    const isStarted = now >= matchDateTime && now < matchEndTime;
    const isEnded = now >= matchEndTime;
    
    return { isStarted, isEnded, isFull };
  };

  const { isEnded, isFull } = getMatchStatus();
  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  return (
    <div className="border rounded-lg p-4 bg-card shadow-card">
      <h2 className="font-semibold mb-3">Players ({totalPlayerSlots}/{match.total_slots})</h2>
      
      {match.players && match.players.length > 0 ? (
        <div className="space-y-2">
          {match.players.map((player, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-playarena-100 flex items-center justify-center">
                  {player.player_name.charAt(0).toUpperCase()}
                </span>
                <span>
                  {player.number_of_slots > 1 ? `${player.player_name} (${player.number_of_slots})` : player.player_name}
                </span>
              </div>
              <Badge
                className={`${getStatusStyles(player.player_status)} !hover:bg-transparent !hover:cursor-default`}
              >
                {formatStatus(player.player_status)}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No players have joined yet</p>
      )}
      
      <div className="mt-6">
        {isEnded ? (
          <Button 
            className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
            onClick={() => navigate(`/feedback?matchSlug=${match.slug}`)}
          >
            Give Feedback
          </Button>
        ) : isFull ? (
          <Button 
            className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
            variant="outline"
            disabled
          >
            Match Is Full
          </Button>
        ) : (
          <Button 
            className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
            onClick={() => navigate(`/join/${match.slug}`)}
          >
            Join This Match
          </Button>
        )}
      </div>
      {match.sell_tickets && !isEnded && (
        <div className="mt-4">
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={() => navigate(`/ticketing/${match.slug}`)}
          >
            Buy Tickets
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlayersTable;
