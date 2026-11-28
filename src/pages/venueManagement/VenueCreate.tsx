import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import VenueForm from "@/components/venueManagement/VenueForm";
import Navbar from "@/components/Navbar";

import { BackButton } from "@/components/sc/ui";
const VenueCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = (venueId: string, venueSlug: string) => {
    navigate(`/venue/${venueSlug}`);
  };

  return (
    <div className="min-h-screen bg-sc-bg dark:bg-gray-900" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8.5rem)" }}>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">List your venue</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="px-5 pt-2 pb-28 max-w-3xl mx-auto">
        <VenueForm onSuccess={handleSuccess} />
      </div>

      <Navbar />
    </div>
  );
};

export default VenueCreate;
