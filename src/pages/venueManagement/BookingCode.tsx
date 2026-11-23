import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import VenueAccessCode from "@/components/venueManagement/VenueAccessCode";

import { BackButton } from "@/components/sc/ui";
const BookingCode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVenue = async () => {
      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
          navigate("/auth");
          return;
        }

        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id")
          .eq("user_id", userData.user.id)
          .single();

        if (venueError || !venueData) {
          toast({ title: "Error", description: "No linked venue found. Please link a venue first.", variant: "destructive" });
          navigate("/profile/my-venue");
          return;
        }

        setVenueId(venueData.id);
      } catch (error) {
        console.error("Error checking venue:", error);
        toast({ title: "Error", description: "Failed to check venue status.", variant: "destructive" });
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    checkVenue();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton to="/profile" />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Booking code</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

<main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
  {loading ? (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-sc-green-dark" />
    </div>
  ) : venueId ? (
    <VenueAccessCode venueId={venueId} />
  ) : (
    <div className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-sc-line dark:border-gray-700 p-6 text-center">
      <p className="text-sc-ink3 dark:text-gray-400 mb-4">No linked venue found.</p>
      <Button
        onClick={() => navigate("/profile/my-venue")}
        className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
      >
        Link a Venue
      </Button>
    </div>
  )}
</main>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default BookingCode;
