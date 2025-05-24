import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

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
        navigate("/login");
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
            <h1 className="text-2xl font-bold">Wallet</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center">
          <div className="relative w-full max-w-md rounded-xl shadow-lg bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 p-6 text-white">
            <div className="flex justify-between items-center mb-6">
              <img
                src={document.documentElement.classList.contains("dark") ? "/playarenadark.png" : "/playarenalight.png"}
                alt="PlayArena Logo"
                className="w-32 h-32 object-contain"
              />
              <div className="text-right">
                <p className="text-sm font-semibold">PlayArena Wallet</p>
                <p className="text-xs opacity-75">Virtual Card</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-2xl font-bold">₦12,345.67</p>
              <p className="text-sm opacity-75">Available Balance</p>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm">Cardholder</p>
                <p className="text-base font-semibold">{nickname}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Expiry</p>
                <p className="text-base font-semibold">12/27</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">Card Number</p>
                <p className="text-base font-mono tracking-wider">**** **** **** 1234</p>
              </div>
              <div className="text-right">
                <p className="text-sm">CVV</p>
                <p className="text-base font-mono">***</p>
              </div>
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mt-4">Coming Soon</p>
          <div className="flex justify-center space-x-4 mt-6">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-6 py-2 text-sm"
              disabled
            >
              Add Funds
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-6 py-2 text-sm"
              disabled
            >
              Withdraw
            </Button>
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
