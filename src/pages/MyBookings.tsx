import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import ManagerBookingView from "@/components/ManagerBookingView";

const MyBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        const { data: venueData } = await supabase
          .from("venues")
          .select("id")
          .eq("manager_id", userData.user.id)
          .single();

        if (venueData) {
          setIsVenueLinked(true);
          setVenueId(venueData.id);
        } else {
          toast({
            title: "No Venue Linked",
            description: "Please link a venue to view bookings.",
            variant: "destructive",
          });
          navigate("/my-venue");
        }
      } catch (err) {
        console.error("Error fetching venue:", err);
        toast({
          title: "Error",
            description: "Failed to check venue status",
            variant: "destructive",
          });
          navigate("/my-venue");
        } finally {
          setLoading(false);
        }
      };
      fetchVenue();
    }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">My Bookings</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
          </div>
        ) : isVenueLinked && venueId ? (
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Venue Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManagerBookingView venueId={venueId} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800">
            <CardContent className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400">No linked venue found. Please link a venue.</p>
              <Button
                onClick={() => navigate("/my-venue")}
                className="mt-4 bg-brand hover:bg-brand-dark text-white transition-colors duration-300"
              >
                Link Venue
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
        .text-brand {
          color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
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

export default MyBookings;
