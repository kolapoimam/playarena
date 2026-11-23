import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import UserNotifications from "@/components/profile/UserNotifications";
import { ChevronLeft } from "lucide-react";

import { BackButton } from "@/components/sc/ui";
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
      <div className="min-h-screen flex items-center justify-center bg-sc-bg dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sc-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton to="/profile" />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Notifications</h1>
        </header>

      <div className="flex-grow overflow-y-auto">
        <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
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
