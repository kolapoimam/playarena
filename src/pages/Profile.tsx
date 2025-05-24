import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, LogOut, Trophy, Wallet, Calendar, BookOpen, Mail, Key, MapPin, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("nickname, gender")
            .eq("id", data.user.id)
            .single();
          setProfile({ ...data.user, ...profileData });
          const { data: venueData } = await supabase
            .from("venues")
            .select("*")
            .eq("manager_id", data.user.id);
          setIsVenueLinked(venueData && venueData.length > 0);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();

    // Restore scroll position
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={avatarUrl} alt="User Avatar" />
              <AvatarFallback>{profile?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">{profile?.nickname || "User"}</h1>
            <Link to="/profile/view-profile">
              <Button
                variant="ghost"
                className="mt-2 text-brand hover:text-brand-dark transition-colors duration-300"
              >
                View Profile
              </Button>
            </Link>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Link
                    to="/profile/account-details"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /profile/account-details")} // Debug
                  >
                    <User className="w-5 h-5 mr-3 text-brand" />
                    <span>Account Details</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                  <Link
                    to="/profile/my-matches"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /profile/my-matches")} // Debug
                  >
                    <Calendar className="w-5 h-5 mr-3 text-brand" />
                    <span>My Matches</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                  <Link
                    to="/profile/match-preferences"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /profile/match-preferences")} // Debug
                  >
                    <Trophy className="w-5 h-5 mr-3 text-brand" />
                    <span>Match Preferences</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                  <Link
                    to="/profile/wallet"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /profile/wallet")} // Debug
                  >
                    <Wallet className="w-5 h-5 mr-3 text-brand" />
                    <span>Wallet</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                </nav>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Link
                    to="/profile/my-venue"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /profile/my-venue")} // Debug
                  >
                    <MapPin className="w-5 h-5 mr-3 text-brand" />
                    <span>My Venue</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                  {isVenueLinked && (
                    <>
                      <Link
                        to="/profile/my-bookings"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                        onClick={() => console.log("Navigating to /profile/my-bookings")} // Debug
                      >
                        <Calendar className="w-5 h-5 mr-3 text-brand" />
                        <span>Bookings</span>
                        <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                      </Link>
                      <Link
                        to="/profile/booking-code"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                        onClick={() => console.log("Navigating to /profile/booking-code")} // Debug
                      >
                        <Key className="w-5 h-5 mr-3 text-brand" />
                        <span>Booking Code</span>
                        <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                      </Link>
                    </>
                  )}
                </nav>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Link
                    to="/guides"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    onClick={() => console.log("Navigating to /guides")} // Debug
                  >
                    <BookOpen className="w-5 h-5 mr-3 text-brand" />
                    <span>Guides</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </Link>
                  <a
                    href="mailto:support@sportcliq.com"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                  >
                    <Mail className="w-5 h-5 mr-3 text-brand" />
                    <span>Support</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                  >
                    <LogOut className="w-5 h-5 mr-3 text-brand" />
                    <span>Logout</span>
                    <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                  </button>
                </nav>
              </CardContent>
            </Card>
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
