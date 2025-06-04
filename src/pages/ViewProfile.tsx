
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserDashboard from "../components/UserDashboard";
import CyclerDashboard from "../components/CyclerDashboard";
import Performance from "@/components/Performance";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

type Profile = {
  id: string;
};

const ViewProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("statistics");
  const [dashboardType, setDashboardType] = useState<"cycling" | "match">("match");

  useEffect(() => {
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
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">View Profile</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
              <TabsTrigger
                value="statistics"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Statistics
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Performance
              </TabsTrigger>
            </TabsList>
            <TabsContent value="statistics">
<div className="my-4 flex justify-center">
  <div className="relative inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-600">
    <button
      onClick={() => setDashboardType("match")}
      className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out relative z-10 ${
        dashboardType === "match"
          ? "text-white shadow-sm"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      }`}
    >
      Matches
    </button>
    <button
      onClick={() => setDashboardType("cycling")}
      className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out relative z-10 ${
        dashboardType === "cycling"
          ? "text-white shadow-sm"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      }`}
    >
      Cycling
    </button>
    
    {/* Sliding background */}
    <div
      className={`absolute top-1 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${
        dashboardType === "match" ? "left-1 w-20" : "left-[85px] w-20"
      }`}
    />
  </div>
</div>
              {dashboardType === "cycling" ? (
                <CyclerDashboard profile={profile} />
              ) : (
                <UserDashboard profile={profile} />
              )}
            </TabsContent>
            <TabsContent value="performance">
              <Performance profile={profile} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default ViewProfile;
