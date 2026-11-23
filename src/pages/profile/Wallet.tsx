import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ArrowLeft, User, Building, CreditCard } from "lucide-react";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nickname, setNickname] = useState("User");
  const [loading, setLoading] = useState(true);

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
        .select("nickname")
        .eq("id", session.session.user.id)
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setNickname(data?.nickname || "User");
      setLoading(false);
    };

    fetchProfile();
  }, [navigate, toast]);

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton to="/profile" />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Wallet</h1>
        </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center">
          <div className="w-full max-w-md text-center mb-6">
            <span className="text-2xl font-bold text-red-500 animate-blink">
              Wallet feature is coming soon
            </span>
          </div>
          <div className="relative w-full max-w-md rounded-3xl shadow-card bg-white p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-sc-ink3">Available Balance</span>
              <div className="flex space-x-2">
                <button className="text-sc-ink3 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <span className="text-sc-green-dark">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </span>
              </div>
            </div>
            <div className="text-4xl font-bold text-sc-ink mb-6 flex items-center justify-center">
              <span className="text-sc-green-dark mr-2">₦</span>
              <span>15,584,834</span>
            </div>
            <div className="flex justify-between space-x-4">
              <Button
                className="flex-1 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-2 text-sm flex items-center justify-center"
              >
                Top-up
              </Button>
              <Button
                className="flex-1 bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-2 text-sm flex items-center justify-center"
              >
                Withdraw
              </Button>
            </div>
          </div>

          <div className="mt-6 w-full max-w-md bg-white rounded-3xl shadow-card p-4 flex items-center justify-between">
            <img src="/navlogo.png" alt="Logo" className="w-14 h-14" />
<div className="text-right space-y-2">
  <p className="text-lg font-semibold text-sc-ink flex items-center justify-end">
    <CreditCard className="w-5 h-5 mr-2" /> 1234567890
  </p>
  <p className="text-sm text-sc-ink3 flex items-center justify-end">
    <Building className="w-5 h-5 mr-2" /> Sport Cliq Bank
  </p>
  <p className="text-sm text-sc-ink3 flex items-center justify-end">
    <User className="w-5 h-5 mr-2" /> {nickname}
  </p>
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

export default Wallet;
