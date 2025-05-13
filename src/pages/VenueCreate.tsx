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
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create New Venue</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <VenueForm onSuccess={handleSuccess} />
      </div>

      <Navbar />
    </div>
  );
};

export default VenueCreate;
