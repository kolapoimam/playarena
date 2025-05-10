
interface MatchCardProps {
  title: string;
  details: string;
  image: string;
}

export default function MatchCard({ title, details, image }: MatchCardProps) {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-card shadow-sm">
      <div className="h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground">{details}</p>
      </div>
    </div>
  );
}
