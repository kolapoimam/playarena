import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";

interface MatchCardProps {
  title: string;
  slug: string;
  details: string;
  image: string;
  is_paid: boolean;
  price: number | null;
  match_time: string; // e.g. "2025-05-10T14:00:00Z"
}

export default function MatchCard({
  title,
  slug,
  details,
  image,
  is_paid,
  price,
  match_time,
}: MatchCardProps) {
  const navigate = useNavigate();

  const matchDate = DateTime.fromISO(match_time, { zone: "utc" }).setZone("Africa/Lagos");
  const now = DateTime.now().setZone("Africa/Lagos");
  const tomorrow = now.plus({ days: 1 }).startOf("day");

  let statusLabel = "Upcoming Match";
  let statusClass = "bg-blue-100 text-blue-800";

  if (matchDate < now) {
    statusLabel = "Match Passed";
    statusClass = "bg-gray-200 text-gray-600";
  } else if (matchDate.hasSame(now, "day")) {
    const hoursDiff = matchDate.diff(now, "hours").hours;
    if (hoursDiff >= 0 && hoursDiff <= 2) {
      statusLabel = "Live Match";
      statusClass = "bg-red-100 text-red-700 animate-pulse";
    } else if (hoursDiff > 2) {
      statusLabel = "Today's Match";
      statusClass = "bg-green-100 text-green-700";
    } else {
      statusLabel = "Match Passed";
      statusClass = "bg-gray-200 text-gray-600";
    }
  } else if (matchDate > tomorrow) {
    statusLabel = "Upcoming Match";
    statusClass = "bg-blue-100 text-blue-800";
  }

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden bg-card shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/match/${slug}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <span
          className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-md ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="p-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground">{details}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Match time: {matchDate.toFormat("DDDD 'at' HH:mm")}
        </p>
        <div className="mt-2">
          {is_paid ? (
            <span className="text-sm font-medium text-red-500">
              Paid: ₦{price?.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm font-medium text-green-500">
              Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
