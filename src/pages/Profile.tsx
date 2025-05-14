import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";
import UserDashboard from "@/components/UserDashboard";
import UserMatches from "@/components/UserMatches";
import ProfileSettings from "@/components/ProfileSettings";
import Performance from "@/components/Performance";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
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
      return;
    }

    setProfile(data);
  };

  const handleLogout = () => {
    supabase.auth.signOut().then(() => navigate("/"));
    setShowLogout(false);
  };

  const handleAvatarClick = () => {
    setShowLogout(!showLogout);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowLogout(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 relative">
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 flex items-center justify-between shadow-lg">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-200 text-sm flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">My Profile</h1>
        <div className="relative">
          <img
            src={
              profile?.gender === "male"
                ? "https://img.freepik.com/premium-psd/smiling-3d-cartoon-man-avatar_975163-789.jpg"
                : profile?.gender === "female"
                ? "https://img.freepik.com/free-vector/young-girl-with-pigtails_1308-176684.jpg"
                : "https://img-new.cgtrader.com/items/4506145/4d6ab481d2/large/football-player-avatar-3d-icon-3d-model-4d6ab481d2.jpg"
            }
            alt="User Avatar"
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={handleAvatarClick}
          />
          {showLogout && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-start px-4 py-2 text-sm"
                onClick={handleSettingsClick}
              >
                Profile & Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-700 flex items-center justify-start px-4 py-2 text-sm"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log Out
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {showSettings ? (
          <ProfileSettings profile={profile} setProfile={setProfile} setShowSettings={setShowSettings} />
        ) : (
          <>
            <UserDashboard profile={profile} />
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="matches"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                >
                  My Matches
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                >
                  Performance
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    View your matches or performance stats using the tabs above.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="matches">
                <UserMatches profile={profile} />
              </TabsContent>
              <TabsContent value="performance">
                <Performance profile={profile} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default Profile;
