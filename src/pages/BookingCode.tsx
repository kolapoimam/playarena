import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import VenueAccessCode from "@/components/VenueAccessCode";
import Navbar from "@/components/Navbar";

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
          navigate("/login");
          return;
        }

        const { data: venueData, error: venueError } = await supabase
          .from("venues")
          .select("id")
          .eq("manager_id", userData.user.id)
          .single();

        if (venueError || !venueData) {
          toast({ title: "Error", description: "No linked venue found. Please link a venue first.", variant: "destructive" });
          navigate("/profile/my-venue");
          return;
        }

        setVenueId(venueData.id);
      } catch (error) {
        toast({ title: "Error", description: "Failed to check venue status.", variant: "destructive" });
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    checkVenue();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">Booking Code</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : venueId ? (
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-2xl">
            <CardContent className="p-6">
              <VenueAccessCode venueId={venueId} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No linked venue found.</p>
              <Button
                onClick={() => navigate("/profile/my-venue")}
                className="bg-brand hover:bg-brand-dark text-white rounded-lg"
              >
                Link a Venue
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navbar */}
      <div className="sticky bottom-0 z-20">
        <Navbar />
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .text-brand {
          color: #17a34a;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
        .bg-brand-dark {
          background-color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default BookingCode;
