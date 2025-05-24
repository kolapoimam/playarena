import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
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
  const [showDropdown, setShowDropdown] = useState(false);

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
    setShowDropdown(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowDropdown(false);
  };

  const username = profile?.nickname || profile?.first_name || "User";

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
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
            className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-md"
            onClick={() => setShowDropdown(!showDropdown)}
          />
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-10 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{username}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{profile?.email}</p>
              </div>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-3 text-sm rounded-none"
                onClick={handleSettingsClick}
              >
                <Settings size={16} className="mr-2" />
                Profile & Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-start px-4 py-3 text-sm rounded-none"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log Out
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 px-6 py-4 sticky top-[64px] z-10 shadow-sm">
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Welcome, {username}!
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Explore your dashboard, manage matches, or check your performance stats.
          </p>
        </div>

        <div className="flex-1 flex flex-col pb-24"> {/* Added padding bottom for space above navbar */}
          {showSettings ? (
            <div className="px-6 pt-2">
              <ProfileSettings profile={profile} setProfile={setProfile} setShowSettings={setShowSettings} />
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex-1 flex flex-col"
            >
              <div className="sticky top-[136px] z-10 px-6">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-lg h-12"> {/* Fixed height */}
                  <TabsTrigger
                    value="dashboard"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm font-medium rounded-md"
                  >
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="matches"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm font-medium rounded-md"
                  >
                    My Matches
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm font-medium rounded-md"
                  >
                    Performance
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pt-6"> {/* Content area with padding and scrolling */}
                <TabsContent value="dashboard" className="mt-0 pb-6">
                  <UserDashboard profile={profile} />
                </TabsContent>
                <TabsContent value="matches" className="mt-0 pb-6">
                  <UserMatches profile={profile} />
                </TabsContent>
                <TabsContent value="performance" className="mt-0 pb-6">
                  <Performance profile={profile} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 z-20">
        <Navbar />
      </div>
    </div>
  );
};

export default Profile;
