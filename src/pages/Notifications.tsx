import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import UserNotifications from "@/components/UserNotifications";
import { ChevronLeft } from "lucide-react";

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isPreferencesOpen, setIsPreferencesOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
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

      <div className="overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
            <CardContent className="p-6">
              <UserNotifications profile={profile} setShowNotifications={() => navigate("/profile")} />

              {/* Preferences Section (Collapsible) */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6 space-y-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                >
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Notification Preferences</h2>
                  <span>{isPreferencesOpen ? "-" : "+"}</span>
                </div>
                {isPreferencesOpen && (
                  <div className="space-y-4">
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        {/* Add your preference fields here, e.g., toggle for match notifications */}
                        <p className="text-gray-600 dark:text-gray-300">Enable match playing time notifications.</p>
                        {/* Example toggle (replace with actual form fields) */}
                        <Switch className="data-[state=checked]:bg-green-500 mt-2" />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Settings Section (Collapsible) */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6 space-y-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Notification Settings</h2>
                  <span>{isSettingsOpen ? "-" : "+"}</span>
                </div>
                {isSettingsOpen && (
                  <div className="space-y-4">
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        {/* Add your settings fields here, e.g., toggle for push/email */}
                        <p className="text-gray-600 dark:text-gray-300">Receive push notifications.</p>
                        {/* Example toggle (replace with actual form fields) */}
                        <Switch className="data-[state=checked]:bg-green-500 mt-2" />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </>
  );
};

export default Notifications;
