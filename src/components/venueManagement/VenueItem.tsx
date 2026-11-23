import { Cover } from "@/components/sc/ui";
import { Star, MessageCircle, CheckCircle } from "lucide-react";

interface VenueItemProps {
  name: string;
  location: string;
  image_urls: string[] | null;
  venue_phone: string | null;
  aggregated_rating: number | null;
  is_verified: boolean;
}

export default function VenueItem({ name, location, image_urls, venue_phone, aggregated_rating, is_verified }: VenueItemProps) {
  const defaultImage = "/placeholders/stadium.webp";
  const image = image_urls && image_urls.length > 0 ? image_urls[0] : defaultImage;

  const handleBookVenue = () => {
    if (venue_phone) {
      const message = encodeURIComponent(`Hello, I'd like to book ${name} for a match. Can you provide more details on availability and pricing?`);
      window.open(`https://wa.me/+234${venue_phone}?text=${message}`, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-3xl shadow-card hover:shadow-lg transition-all duration-200 dark:border-gray-700">
      <div className="h-24 w-24 rounded-lg overflow-hidden flex-shrink-0">
        <div className="relative w-full h-full"><Cover src={image_urls?.[0]} kind="venue" alt={name} /></div>
      </div>
      <div className="flex-1">
<div className="flex items-center">
  <h3 className="font-bold text-sc-ink dark:text-gray-100">{name}</h3>
  {is_verified && (
    <img 
      src="/green-verified.png" 
      alt="Verified" 
      className="ml-2 w-4 h-4"
    />
  )}
</div>
        <p className="text-sm text-sc-ink3 dark:text-gray-400">{location}</p>
        {aggregated_rating !== null ? (
          <div className="flex items-center text-sm text-yellow-500 mt-1">
            <Star size={14} className="mr-1 fill-yellow-500" />
            <span>{aggregated_rating.toFixed(1)} / 5.5</span>
          </div>
        ) : (
          <p className="text-sm text-sc-ink3 dark:text-gray-400 mt-1">No ratings yet</p>
        )}
        {venue_phone && (
          <button
            onClick={handleBookVenue}
            className="mt-2 text-sm text-sc-green-dark hover:text-green-600 flex items-center"
          >
            <MessageCircle size={14} className="mr-1" />
            Book via WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
