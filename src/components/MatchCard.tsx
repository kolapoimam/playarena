import { useNavigate } from "react-router-dom";

     interface MatchCardProps {
       title: string;
       slug: string;
       details: string;
       image: string;
       is_paid: boolean;
       price: number | null;
     }

     export default function MatchCard({ title, slug, details, image, is_paid, price }: MatchCardProps) {
       const navigate = useNavigate();

       return (
         <div 
           className="flex flex-col rounded-lg overflow-hidden bg-card shadow-sm cursor-pointer"
           onClick={() => navigate(`/match/${slug}`)}
         >
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
