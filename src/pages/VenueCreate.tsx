import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import VenueForm from "@/components/VenueForm";
import Navbar from "@/components/Navbar";

const VenueCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = (venueId: string, venueSlug: string) => {
    navigate(`/venue/${venueSlug}`);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Create New Venue</h1>
        
        <VenueForm onSuccess={handleSuccess} />
      </div>
      
      <Navbar />
    </div>
  );
};

export default VenueCreate;
