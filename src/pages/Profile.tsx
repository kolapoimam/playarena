import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, LogOut, Trophy, Wallet, Volleyball, Settings, Calendar, Bike, BookOpen, Mail, Key, MapPin, ChevronRight, FileText, ArrowLeft, CircleUserRound, Bell } from "lucide-react";
import Navbar from "@/components/Navbar";

const Profile = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (data.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("nickname, gender")
            .eq("id", data.user.id)
            .single();
          if (profileError) throw profileError;

          setProfile({ ...data.user, ...profileData });

          try {
            const { data: venueData, error: venueError } = await supabase
              .from("venues")
              .select("*")
              .eq("user_id", data.user.id);
            if (venueError) {
              console.error("Error fetching venue data:", venueError);
              setIsVenueLinked(false);
            } else {
              setIsVenueLinked(venueData && venueData.length > 0);
            }
          } catch (venueError) {
            console.error("Error fetching venue data:", venueError);
            setIsVenueLinked(false);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();

    window.scrollTo(0, 0);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Success",
        description: "You have been logged out successfully.",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const avatarUrl =
    profile?.gender === "male"
      ? "https://img.freepik.com/premium-psd/smiling-3d-cartoon-man-avatar_975163-789.jpg"
      : profile?.gender === "female"
      ? "https://img.freepik.com/free-vector/young-girl-with-pigtails_1308-176684.jpg"
      : "https://img-new.cgtrader.com/items/4506145/4d6ab481d2/large/football-player-avatar-3d-icon-3d-model-4d6ab481d2.jpg";

  if (isLoading) {
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
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600 transition-colors duration-300"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Profile</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center mb-8">
            <Avatar className="w-24 h-24 mb-4 ring-2 ring-green-500">
              <AvatarImage src={avatarUrl} alt="User Avatar" />
              <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                {profile?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile?.nickname || "User"}
            </h1>
            <Link to="/profile/view-profile">
              <Button
                variant="outline"
                className="mt-3 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-colors duration-300"
              >
                View Profile
              </Button>
            </Link>
          </div>

          <div className="max-w-md mx-auto space-y-6">
            {/* Personal Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Personal
              </h2>
              <Card className="border-none shadow-lg rounded-xl bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <Link
                      to="/profile/account-details"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/account-details")}
                    >
                      <CircleUserRound className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Account Details</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/my-matches"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/my-matches")}
                    >
                      <Volleyball className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">My Matches</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/my-cycling"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/my-cycling")}
                    >
                      <Bike className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">My Cycling</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/match-preferences"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/match-preferences")}
                    >
                      <Settings className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Preferences</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/notifications"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/notifications")}
                    >
                      <Bell className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Notifications</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/wallet"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/wallet")}
                    >
                      <Wallet className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Wallet</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Venue Manager Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Venue Manager
              </h2>
              <Card className="border-none shadow-lg rounded-xl bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <Link
                      to="/profile/my-venue"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /profile/my-venue")}
                    >
                      <MapPin className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">My Venue</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    {isVenueLinked && (
                      <>
                        <Link
                          to="/profile/my-bookings"
                          className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                          onClick={() => console.log("Navigating to /profile/my-bookings")}
                        >
                          <Calendar className="w-5 h-5 mr-3 text-green-500" />
                          <span className="text-gray-900 dark:text-gray-100">Bookings</span>
                          <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                        </Link>
                        <Link
                          to="/profile/booking-code"
                          className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                          onClick={() => console.log("Navigating to /profile/booking-code")}
                        >
                          <Key className="w-5 h-5 mr-3 text-green-500" />
                          <span className="text-gray-900 dark:text-gray-100">Booking Code</span>
                          <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                        </Link>
                      </>
                    )}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* More Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                More
              </h2>
              <Card className="border-none shadow-lg rounded-xl bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <Link
                      to="/guides"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /guides")}
                    >
                      <BookOpen className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Guides</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <a
                      href="mailto:support@sportcliq.com"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                    >
                      <Mail className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Support</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </a>
                    <Link
                      to="/terms-privacy"
                      className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                      onClick={() => console.log("Navigating to /terms-privacy")}
                    >
                      <FileText className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Terms & Conditions</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-300"
                    >
                      <LogOut className="w-5 h-5 mr-3 text-green-500" />
                      <span className="text-gray-900 dark:text-gray-100">Logout</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default Profile;
