
interface VenueItemProps {
  name: string;
  location: string;
  image: string;
}

export default function VenueItem({ name, location, image }: VenueItemProps) {
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
