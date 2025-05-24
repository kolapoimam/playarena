import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import UserDashboard from "../components/UserDashboard";
import Performance from "@/components/Performance";
import Navbar from "@/components/Navbar";

const ViewProfile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header with Back Button */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="text-brand hover:text-brand-dark">
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4">View Profile</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        <UserDashboard />
        <Performance />
      </div>

      {/* Bottom Navbar */}
      <Navbar />

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default ViewProfile;
