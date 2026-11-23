import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";

interface MatchCardProps {
  title: string;
  slug: string;
  details: string;
  image: string;
  is_paid: boolean;
  price: number | null;
  match_time: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  organizer_id: string;
}

export default function MatchCard({
  title,
  slug,
  details,
  image,
  is_paid,
  price,
  match_time,
  start_time,
  end_time,
  organizer_name,
  organizer_id,
}: MatchCardProps) {
  const navigate = useNavigate();
  const matchDate = DateTime.fromISO(match_time, { zone: "utc" }).setZone("Africa/Lagos");
  const now = DateTime.now().setZone("Africa/Lagos");
  const tomorrow = now.plus({ days: 1 }).startOf("day");
  const startDateTime = DateTime.fromISO(`${matchDate.toISODate()}T${start_time}`, { zone: "utc" }).setZone("Africa/Lagos");
  const endDateTime = DateTime.fromISO(`${matchDate.toISODate()}T${end_time}`, { zone: "utc" }).setZone("Africa/Lagos");

  let statusLabel = "";
  let statusClass = "";

  if (now > endDateTime) {
    statusLabel = "Passed";
    statusClass = "bg-sc-soft2 text-sc-ink3";
  } else if (now >= startDateTime && now <= endDateTime) {
    statusLabel = "Live";
    statusClass = "bg-red-100 text-red-700 animate-pulse";
  } else if (now.hasSame(matchDate, "day") && now < startDateTime) {
    statusLabel = "Today";
    statusClass = "bg-sc-green-bg text-sc-green-dark";
  } else if (matchDate > tomorrow) {
    statusLabel = "Upcoming";
    statusClass = "bg-blue-100 text-blue-800";
  } else {
    statusLabel = "Upcoming";
    statusClass = "bg-blue-100 text-blue-800";
  }

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/match/${slug}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-md ${statusClass}`}
          >
            {statusLabel}
          </span>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-md ${
              is_paid ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {is_paid ? `₦${price?.toFixed(2)}` : "FREE"}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground">{details}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Match time: {startDateTime.toFormat("DDDD 'at' HH:mm")}
        </p>
        <div className="mt-2">
          {is_paid ? (
            <span className="text-sm font-medium text-red-500">
              Paid: ₦{price?.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm font-medium text-sc-green-dark">
              Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
