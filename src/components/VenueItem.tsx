interface VenueItemProps {
  name: string;
  location: string;
  image_urls: string[] | null;
}

export default function VenueItem({ name, location, image_urls }: VenueItemProps) {
  const defaultImage = "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg";
  const image = image_urls && image_urls.length > 0 ? image_urls[0] : defaultImage;

  return (
    <div className="flex items-center gap-4 p-2 hover:bg-secondary rounded-lg transition-colors duration-200">
      <div className="h-20 w-20 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h3 className="font-bold">{name}</h3>
        <p className="text-muted-foreground text-sm">{location}</p>
      </div>
    </div>
  );
}
