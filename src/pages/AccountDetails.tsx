import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProfileSettings from "@/components/ProfileSettings";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

const AccountDetails = ({ profile, setProfile }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Account Details</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ProfileSettings profile={profile} setProfile={setProfile} setShowSettings={() => {}} />
          </div>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default AccountDetails;
