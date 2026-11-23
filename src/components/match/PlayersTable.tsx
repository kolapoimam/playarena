import { Avatar, Pill, Progress, SPORT, Sport, initialsOf, sportFor } from "@/components/sc/ui";
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
  status = status || "registered";
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

  const pct = match.total_slots ? Math.min(100, (totalPlayerSlots * 100) / match.total_slots) : 0;
  const left = Math.max(0, match.total_slots - totalPlayerSlots);
  const statusSport = (st: string): Sport => {
    const k = (st || "").toLowerCase();
    return k === "checked in" ? "football" : k === "absent" ? "red" : "tennis";
  };

  return (
    <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
      <div className="flex justify-between items-baseline">
        <span className="text-base font-extrabold">Players</span>
        <span className="text-sm font-bold" style={{ color: isFull ? SPORT.red.fg : undefined }}>
          {isEnded ? `${totalPlayerSlots} played` : isFull ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
        </span>
      </div>
      <Progress value={pct} height={10} />
      {match.players && match.players.length > 0 ? (
        <>
          <div className="flex items-center">
            <div className="flex">
              {match.players.slice(0, 5).map((p, i) => (
                <span key={i} className="rounded-full border-[3px] border-white" style={{ marginLeft: i === 0 ? 0 : -10 }}>
                  <Avatar initials={initialsOf(p.player_name)} sport={sportFor(p.player_name)} size={34} />
                </span>
              ))}
            </div>
            <span className="ml-2.5 text-[13px] font-bold text-sc-ink2">
              {totalPlayerSlots} of {match.total_slots} joined
            </span>
          </div>
          <div className="divide-y divide-sc-line">
            {match.players.map((player, index) => (
              <div key={index} className="flex items-center gap-3 py-2.5">
                <Avatar initials={initialsOf(player.player_name)} sport={sportFor(player.player_name)} size={36} />
                <span className="flex-1 min-w-0 text-[15px] font-bold truncate">
                  {player.player_name}
                  {player.number_of_slots > 1 && <span className="text-sc-ink3 font-semibold"> +{player.number_of_slots - 1}</span>}
                </span>
                <Pill sport={statusSport(player.player_status)}>{formatStatus(player.player_status || "registered")}</Pill>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sc-ink3 text-sm m-0">No players have joined yet. Be the first.</p>
      )}
    </div>
  );
};

export default PlayersTable;
