import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserDashboard from "@/components/profile/UserDashboard";
import CyclerDashboard from "@/components/profile/CyclerDashboard";
import Performance from "@/components/profile/Performance";
import Navbar from "@/components/Navbar";
import { Bike, Trophy } from "lucide-react";

import { BackButton, SPORT } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
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
      <PageSkeleton />
    );
  }

  const seg = (active: boolean) =>
    `flex-1 h-10 rounded-full text-sm font-bold transition-all ${active ? "bg-white text-sc-ink shadow-[0_1px_3px_rgba(14,20,17,0.12)]" : "text-sc-ink2"}`;

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="pt-3 flex items-center justify-between gap-3">
          <BackButton to="/profile" />
          <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Stats and performance</h1>
          <div className="min-w-11" />
        </div>
      </header>

      <div className="flex-grow px-5 pt-5 pb-32 flex flex-col gap-4">
        <div className="flex p-1 rounded-full bg-[#E9ECE6]" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={activeTab === "statistics"} className={seg(activeTab === "statistics")} onClick={() => setActiveTab("statistics")}>
            Statistics
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "performance"} className={seg(activeTab === "performance")} onClick={() => setActiveTab("performance")}>
            Performance
          </button>
        </div>

        {activeTab === "statistics" ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { id: "match", label: "Football", icon: Trophy, sport: "football" },
                { id: "cycling", label: "Cycling", icon: Bike, sport: "cycling" },
              ] as const).map((t) => {
                const on = dashboardType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDashboardType(t.id)}
                    className="h-14 rounded-[20px] flex items-center justify-center gap-2 text-[15px] font-extrabold transition-colors"
                    style={on ? { background: SPORT[t.sport].bg, color: SPORT[t.sport].fg, boxShadow: `inset 0 0 0 2px ${SPORT[t.sport].solid}` } : { background: "#FFFFFF", color: "#4A524D" }}
                  >
                    <t.icon size={20} /> {t.label}
                  </button>
                );
              })}
            </div>
            {dashboardType === "cycling" ? <CyclerDashboard profile={profile} /> : <UserDashboard profile={profile} />}
          </>
        ) : (
          <Performance profile={profile} />
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default ViewProfile;
