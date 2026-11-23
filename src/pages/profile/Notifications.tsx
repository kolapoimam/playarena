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
import { PageSkeleton } from "@/components/sc/skeletons";
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
      <PageSkeleton />
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

      <div className="flex-grow overflow-y-auto px-5 pt-3">
        <p className="m-0 mb-3 text-sm text-sc-ink2">Pick what you hear about and how. Push alerts also need to be on in Settings.</p>
        <div>
          <div>
            <UserNotifications
              profile={profile}
              setShowNotifications={() => navigate("/profile")}
              singleArrow={true} // Prop to indicate single arrow for dropdown
              isVenueOwner={isVenueOwner} // Pass venue owner status
            />
          </div>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default Notifications;
