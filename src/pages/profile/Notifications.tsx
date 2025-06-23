import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import UserNotifications from "@/components/profile/UserNotifications";
import { ChevronLeft } from "lucide-react";

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState(null);
  const [isVenueOwner, setIsVenueOwner] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProfileAndVenueStatus = async () => {
      setLoading(true);

      // Fetch user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/auth");
        return;
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (profileError) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Check if user is a venue owner
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("id")
        .eq("user_id", session.session.user.id)
        .limit(1);

      if (venueError) {
        console.error("Error checking venue ownership:", venueError);
        setIsVenueOwner(false);
      } else {
        setIsVenueOwner(venueData.length > 0);
      }

      setLoading(false);
    };

    fetchProfileAndVenueStatus();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
          <CardContent className="p-6">
            <UserNotifications
              profile={profile}
              setShowNotifications={() => navigate("/profile")}
              singleArrow={true} // Prop to indicate single arrow for dropdown
              isVenueOwner={isVenueOwner} // Pass venue owner status
            />
          </CardContent>
        </Card>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default Notifications;
