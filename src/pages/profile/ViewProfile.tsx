import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserDashboard from "@/components/profile/UserDashboard";
import CyclerDashboard from "@/components/profile/CyclerDashboard";
import Performance from "@/components/profile/Performance";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

import { BackButton } from "@/components/sc/ui";
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
        navigate("/auth");
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
      <div className="min-h-screen flex items-center justify-center bg-sc-bg dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sc-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton to="/profile" />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Edit profile</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-sc-soft dark:bg-gray-700 rounded-t-lg">
              <TabsTrigger
                value="statistics"
                className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
              >
                Statistics
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
              >
                Performance
              </TabsTrigger>
            </TabsList>
            <TabsContent value="statistics">
<div className="my-4 flex justify-center">
  <div className="relative inline-flex bg-sc-soft dark:bg-gray-700 rounded-full p-1 shadow-inner">
    <button
      onClick={() => setDashboardType("match")}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out relative z-10 min-w-[80px] ${
        dashboardType === "match"
          ? "text-white"
          : "text-gray-600 dark:text-gray-400"
      }`}
    >
      Matches
    </button>
    <button
      onClick={() => setDashboardType("cycling")}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out relative z-10 min-w-[80px] ${
        dashboardType === "cycling"
          ? "text-white"
          : "text-gray-600 dark:text-gray-400"
      }`}
    >
      Cycling
    </button>
    
    {/* Sliding background */}
    <div
      className={`absolute top-1 bottom-1 bg-green-500 rounded-full shadow-lg transition-transform duration-300 ease-in-out w-[84px] ${
        dashboardType === "match" ? "translate-x-1" : "translate-x-[85px]"
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
