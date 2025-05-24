import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Settings, Bell, User, Wallet, Trophy, MapPin, Book, HelpCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import UserDashboard from "@/components/UserDashboard";
import UserMatches from "@/components/UserMatches";
import ProfileSettings from "@/components/ProfileSettings";
import Performance from "@/components/Performance";
import UserNotifications from "@/components/UserNotifications";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

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
    setShowNotifications(false);
    setShowDropdown(false);
    setActiveSection("settings");
  };

  const handleNotificationsClick = () => {
    setShowNotifications(true);
    setShowSettings(false);
    setShowDropdown(false);
    setActiveSection("notifications");
  };

  const username = profile?.nickname || profile?.first_name || "User";

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
        <Button
          variant="ghost"
          onClick={() => {
            if (showSettings || showNotifications) {
              setShowSettings(false);
              setShowNotifications(false);
            } else {
              navigate(-1);
            }
          }}
          className="text-white hover:text-gray-200 text-sm flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">Welcome, {username}!</h1>
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
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-10">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center">
                <img
                  src={
                    profile?.gender === "male"
                      ? "https://img.freepik.com/premium-psd/smiling-3d-cartoon-man-avatar_975163-789.jpg"
                      : profile?.gender === "female"
                      ? "https://img.freepik.com/free-vector/young-girl-with-pigtails_1308-176684.jpg"
                      : "https://img-new.cgtrader.com/items/4506145/4d6ab481d2/large/football-player-avatar-3d-icon-3d-model-4d6ab481d2.jpg"
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{username}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View your full profile</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => navigate("/account-details")}
              >
                <User size={16} className="mr-2" /> Account Details
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={handleSettingsClick}
              >
                <Settings size={16} className="mr-2" /> Profile Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={handleNotificationsClick}
              >
                <Bell size={16} className="mr-2" /> Match Preference
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
              >
                <Wallet size={16} className="mr-2" /> Wallet
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("matches")}
              >
                <User size={16} className="mr-2" /> My Matches
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("stats")}
              >
                <Trophy size={16} className="mr-2" /> Statistics
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("badges")}
              >
                <Trophy size={16} className="mr-2" /> Badges
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("venue-stats")}
              >
                <MapPin size={16} className="mr-2" /> Venue Stats
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("access-codes")}
              >
                <Key size={16} className="mr-2" /> Access Codes
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("venue-wallet")}
              >
                <Wallet size={16} className="mr-2" /> Venue Wallet
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("bookings")}
              >
                <Book size={16} className="mr-2" /> Bookings
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("guides")}
              >
                <HelpCircle size={16} className="mr-2" /> Guides
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={() => setActiveSection("faqs")}
              >
                <HelpCircle size={16} className="mr-2" /> FAQs
              </Button>
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-start px-4 py-2 text-sm rounded-none"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" /> Log Out
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 px-6 py-4 sticky top-[64px] z-10 shadow-sm">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {activeSection === "dashboard" && "Explore your dashboard, manage matches, or check your stats."}
            {activeSection === "settings" && "Manage your account and preferences."}
            {activeSection === "notifications" && "Customize your notification settings."}
            {activeSection === "matches" && "View and manage your organized or played matches."}
            {activeSection === "stats" && "Check your performance statistics."}
            {activeSection === "badges" && "View your earned badges."}
            {activeSection === "venue-stats" && "Track your venue performance."}
            {activeSection === "access-codes" && "Manage your venue access codes."}
            {activeSection === "venue-wallet" && "Manage your venue wallet."}
            {activeSection === "bookings" && "View your bookings and transactions."}
            {activeSection === "guides" && "Access helpful guides."}
            {activeSection === "faqs" && "Find answers to common questions."}
          </p>
        </div>

        <div className="flex-1 flex flex-col pb-24">
          {showSettings && (
            <div className="px-6 pt-2">
              <ProfileSettings profile={profile} setProfile={setProfile} setShowSettings={setShowSettings} />
            </div>
          )}
          {showNotifications && (
            <div className="px-6 pt-2">
              <UserNotifications profile={profile} setShowNotifications={setShowNotifications} />
            </div>
          )}
          {!showSettings && !showNotifications && (
            <>
              {activeSection === "dashboard" && (
                <div className="px-6 pt-2">
                  <UserDashboard profile={profile} />
                </div>
              )}
              {activeSection === "matches" && (
                <div className="px-6 pt-2">
                  <UserMatches profile={profile} />
                </div>
              )}
              {activeSection === "stats" && (
                <div className="px-6 pt-2">
                  <Performance profile={profile} />
                </div>
              )}
              {activeSection === "badges" && (
                <div className="px-6 pt-2">
                  {/* Add Badges component here if created */}
                  <p>Badges content goes here.</p>
                </div>
              )}
              {activeSection === "venue-stats" && (
                <div className="px-6 pt-2">
                  {/* Add VenueStats component here if created */}
                  <p>Venue Stats content goes here.</p>
                </div>
              )}
              {activeSection === "access-codes" && (
                <div className="px-6 pt-2">
                  {/* Add AccessCodes component here if created */}
                  <p>Access Codes content goes here.</p>
                </div>
              )}
              {activeSection === "venue-wallet" && (
                <div className="px-6 pt-2">
                  {/* Add VenueWallet component here if created */}
                  <p>Venue Wallet content goes here.</p>
                </div>
              )}
              {activeSection === "bookings" && (
                <div className="px-6 pt-2">
                  {/* Add Bookings component here if created */}
                  <p>Bookings content goes here.</p>
                </div>
              )}
              {activeSection === "guides" && (
                <div className="px-6 pt-2">
                  {/* Add Guides component here if created */}
                  <p>Guides content goes here.</p>
                </div>
              )}
              {activeSection === "faqs" && (
                <div className="px-6 pt-2">
                  {/* Add FAQs component here if created */}
                  <p>FAQs content goes here.</p>
                </div>
              )}
            </>
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
