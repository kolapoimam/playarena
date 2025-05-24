import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, LogOut, Trophy, Wallet, Calendar, BookOpen, Mail, Key, MapPin, ChevronRight, ChevronDown, ChevronUp, Home } from "lucide-react";
import UserDashboard from "../components/UserDashboard";
import Performance from "../components/Performance";

const supabase = createClient("https://your-supabase-url", "your-supabase-key");

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      // Check if user has a linked venue
      const { data: venueData } = await supabase
        .from("venues")
        .select("*")
        .eq("manager_id", data.user.id);
      setIsVenueLinked(venueData && venueData.length > 0);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const toggleStats = () => {
    setShowStats(!showStats);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-nunito">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Profile Picture and Nickname */}
        <div className="flex flex-col items-center mb-6">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage src={user?.user_metadata?.avatar_url || "/football-player.png"} alt="Profile" />
            <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{user?.user_metadata?.nickname || "User"}</h1>
          <Button
            variant="ghost"
            className="mt-2 text-brand hover:text-brand-dark transition-colors duration-300"
            onClick={toggleStats}
          >
            View Profile <span className="ml-2">{showStats ? <ChevronUp /> : <ChevronDown />}</span>
          </Button>
        </div>

        {/* Stats and Performance Section */}
        {showStats && (
          <div className="mb-6 animate-slide-down">
            <UserDashboard />
            <Performance />
          </div>
        )}

        {/* Left-Aligned Menu */}
        <div className="max-w-md mx-auto">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <nav className="space-y-2">
                <Link
                  to="/profile/account-details"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <User className="w-5 h-5 mr-3 text-brand" />
                  <span>Account Details</span>
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/profile/my-matches"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <Calendar className="w-5 h-5 mr-3 text-brand" />
                  <span>My Matches</span>
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/profile/match-preferences"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <Trophy className="w-5 h-5 mr-3 text-brand" />
                  <span>Match Preferences</span>
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/profile/wallet"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <Wallet className="w-5 h-5 mr-3 text-brand" />
                  <span>Wallet</span>
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/profile/my-venue"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
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
                    >
                      <Calendar className="w-5 h-5 mr-3 text-brand" />
                      <span>My Bookings</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                    <Link
                      to="/profile/booking-code"
                      className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    >
                      <Key className="w-5 h-5 mr-3 text-brand" />
                      <span>Booking Code</span>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                  </>
                )}
                <Link
                  to="/guides"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
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

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around py-2">
          <Link to="/home" className="text-gray-500 hover:text-brand">
            <Home className="w-6 h-6" />
          </Link>
          <Link to="/matches" className="text-gray-500 hover:text-brand">
            <Calendar className="w-6 h-6" />
          </Link>
          <Link to="/profile" className="text-brand">
            <User className="w-6 h-6" />
          </Link>
        </div>
      </nav>

      {/* Custom Animations */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-in-out;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
