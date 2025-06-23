import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import VenueAccessCode from "@/components/VenueAccessCode";

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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600 flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Booking Code</h1>
          <div className="w-10"></div>
        </div>
      </header>

<main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
  {loading ? (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
    </div>
  ) : venueId ? (
    <VenueAccessCode venueId={venueId} />
  ) : (
    <div className="w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
      <p className="text-gray-600 dark:text-gray-400 mb-4">No linked venue found.</p>
      <Button
        onClick={() => navigate("/profile/my-venue")}
        className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
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
