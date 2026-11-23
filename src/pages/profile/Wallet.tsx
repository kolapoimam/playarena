import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ArrowLeft, User, Building, CreditCard, Zap, ArrowDownToLine, ShieldCheck, Banknote } from "lucide-react";

import { BackButton, Bubble } from "@/components/sc/ui";
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

      <div className="flex-grow overflow-y-auto px-5 pt-3 pb-6 flex flex-col gap-4">
        <div className="relative rounded-[28px] p-5 text-white overflow-hidden" style={{ background: "#0E1411" }}>
          <span aria-hidden="true" className="absolute -right-12 -top-12 w-48 h-48 rounded-full border-[22px] border-white/10" />
          <span aria-hidden="true" className="absolute right-16 -bottom-16 w-32 h-32 rounded-full bg-sc-green/40" />
          <div className="relative flex items-center justify-between">
            <img src="/brand/sportcliq-wordmark-white.png" alt="SportCliq" className="h-7 w-auto" />
            <span className="h-7 px-3 rounded-full bg-[#BEF264] text-sc-ink text-[11px] font-extrabold tracking-[0.1em] inline-flex items-center">COMING SOON</span>
          </div>
          <div className="relative mt-8 flex flex-col">
            <span className="text-xs font-bold tracking-[0.12em] opacity-60">SPORTCLIQ WALLET</span>
            <span className="text-[34px] leading-10 font-extrabold tracking-[-0.03em] blur-[6px] select-none" aria-hidden="true">₦ 00,000.00</span>
          </div>
          <div className="relative mt-4 flex items-center justify-between text-sm">
            <span className="font-bold">{nickname || "Your name"}</span>
            <span className="opacity-60 tracking-[0.2em]">•••• ••••</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">One wallet for every game</h2>
          <p className="m-0 text-sm text-sc-ink2">We are building a wallet so you can pay for slots in one tap and get your earnings faster.</p>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden">
          {[
            { icon: Zap, sport: "football" as const, title: "Pay in one tap", sub: "Top up once and join paid matches instantly" },
            { icon: ArrowDownToLine, sport: "money" as const, title: "Faster cashouts", sub: "Organisers and hosts withdraw to their bank" },
            { icon: ShieldCheck, sport: "guide" as const, title: "Refunds back to you", sub: "Cancelled games refund straight to your wallet" },
          ].map((r, i) => (
            <div key={r.title} className={`flex items-center gap-3 px-[18px] py-4 ${i ? "border-t border-sc-line" : ""}`}>
              <Bubble icon={r.icon} sport={r.sport} size={42} radius={14} />
              <span className="flex flex-col">
                <span className="text-[15px] font-extrabold">{r.title}</span>
                <span className="text-xs text-sc-ink3">{r.sub}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "#E3F5E9" }}>
          <Bubble icon={Banknote} sport="football" size={42} radius={14} />
          <span className="flex-1 flex flex-col">
            <span className="text-sm font-extrabold text-sc-ink">Organised a paid match?</span>
            <span className="text-xs text-sc-ink2">Cash out from the match in Manage with your super code.</span>
          </span>
          <button type="button" onClick={() => navigate("/confirm-checkin")} className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-bold">Manage</button>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default Wallet;
