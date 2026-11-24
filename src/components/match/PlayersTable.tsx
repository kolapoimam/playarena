import { Avatar, Pill, Progress, SPORT, Sport, initialsOf, sportFor } from "@/components/sc/ui";
import { matchWindow, phase } from "@/lib/activityTime";
import { addHours } from "date-fns";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
      return "bg-[#FEF9C3] text-[#A16207] border-transparent";
    case "checked in":
      return "bg-[#DCFCE7] text-[#15803D] border-transparent";
    case "absent":
      return "bg-[#FEE2E2] text-[#B91C1C] border-transparent";
    default:
      return "bg-sc-soft text-sc-ink2 border-transparent";
  }
};

const PlayersTable: React.FC<PlayersTableProps> = ({ match }) => {
  
  const getMatchStatus = () => {
    const { isStarted, isEnded } = phase(matchWindow(match as any));

    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const isFull = totalPlayerSlots >= match.total_slots;
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

  const [open, setOpen] = useState(false);
  const hasPlayers = !!match.players && match.players.length > 0;

  return (
    <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
      <button
        type="button"
        onClick={() => hasPlayers && setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="players-list"
        className="flex flex-col gap-3.5 text-left w-full"
        disabled={!hasPlayers}
      >
      <div className="flex justify-between items-baseline w-full">
        <span className="text-base font-extrabold">Players</span>
        <span className="text-sm font-bold" style={{ color: isFull ? SPORT.red.fg : undefined }}>
          {isEnded ? `${totalPlayerSlots} played` : isFull ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
        </span>
      </div>
      <div className="w-full"><Progress value={pct} height={10} /></div>
      {hasPlayers ? (
          <div className="flex items-center w-full">
            <div className="flex">
              {match.players.slice(0, 5).map((p, i) => (
                <span key={i} className="rounded-full border-[3px] border-white" style={{ marginLeft: i === 0 ? 0 : -10 }}>
                  <Avatar seed={p.player_name} initials={initialsOf(p.player_name)} sport={sportFor(p.player_name)} size={34} />
                </span>
              ))}
            </div>
            <span className="ml-2.5 flex-1 text-[13px] font-bold text-sc-ink2">
              {totalPlayerSlots} of {match.total_slots} joined
            </span>
            <span className="h-8 pl-3 pr-2 rounded-full bg-sc-soft text-xs font-bold inline-flex items-center gap-1">
              {open ? "Hide" : "See all"}
              <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </div>
      ) : (
        <p className="text-sc-ink3 text-sm m-0">{isEnded ? "Nobody joined this match." : "No players have joined yet. Be the first."}</p>
      )}
      </button>
      {hasPlayers && open && (
          <div id="players-list" className="divide-y divide-sc-line -mt-1">
            {match.players.map((player, index) => (
              <div key={index} className="flex items-center gap-3 py-2.5">
                <Avatar seed={player.player_name} initials={initialsOf(player.player_name)} sport={sportFor(player.player_name)} size={36} />
                <span className="flex-1 min-w-0 text-[15px] font-bold truncate">
                  {player.player_name}
                  {player.number_of_slots > 1 && <span className="text-sc-ink3 font-semibold"> +{player.number_of_slots - 1}</span>}
                </span>
                <Pill sport={statusSport(player.player_status)}>{formatStatus(player.player_status || "registered")}</Pill>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};

export default PlayersTable;
