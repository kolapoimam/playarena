import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CircleUserRound,
  Download,
  FileText,
  Info,
  LogOut,
  Mail,
  MapPin,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import usePWAInstallPrompt from "@/hooks/usePWAInstallPrompt";
import { ListGroup, ListRow, NavHeader, Pill, Screen } from "@/components/sc/ui";
import { LocationSheet, useUserState } from "@/components/sc/location";
import { resetOnboarding } from "@/components/sc/Onboarding";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = useUserState();
  const [locOpen, setLocOpen] = useState(false);
  const { isInstallable, triggerInstall } = usePWAInstallPrompt();
  const installed = isStandalone();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "See you on the pitch." });
    navigate("/auth");
  };

  return (
    <>
      <Seo title="Settings | Sport Cliq" description="Manage your SportCliq settings." url={window.location.href} image={undefined} children={null} />
      <Screen>
        <NavHeader title="Settings" backTo="/profile" />
        <main className="px-5 pt-5 flex flex-col gap-[18px]">
          <ListGroup title="Location">
            <ListRow
              icon={MapPin}
              sport="guide"
              title={state ? state : "Not set"}
              subtitle="Used to show activities near you"
              right={<Pill sport="guide">Change</Pill>}
              chevron={false}
              onClick={() => setLocOpen(true)}
            />
          </ListGroup>

          <ListGroup title="Account">
            <ListRow icon={CircleUserRound} title="Account details" subtitle="Name, email, phone and password" onClick={() => navigate("/profile/account-details")} />
            <ListRow icon={SlidersHorizontal} title="Match preferences" subtitle="Skill level, match type and gender" onClick={() => navigate("/profile/match-preferences")} />
            <ListRow icon={Bell} title="Notifications" subtitle="Match reminders and ride alerts" onClick={() => navigate("/profile/notifications")} />
          </ListGroup>

          <ListGroup title="App">
            <ListRow
              icon={Download}
              sport="football"
              title={installed ? "App installed" : "Install SportCliq"}
              subtitle={
                installed
                  ? "You're using the installed app"
                  : isInstallable
                  ? "Add SportCliq to your home screen"
                  : isIOS
                  ? "In Safari, tap Share then Add to Home Screen"
                  : "Use your browser menu and choose Install app"
              }
              chevron={false}
              onClick={isInstallable ? triggerInstall : undefined}
              right={isInstallable ? <Pill sport="football">Install</Pill> : undefined}
            />
            <ListRow
              icon={Sparkles}
              sport="pink"
              title="Replay the welcome tour"
              onClick={() => {
                resetOnboarding();
                navigate("/");
              }}
            />
            <ListRow
              icon={SearchIcon}
              title="Clear recent searches"
              chevron={false}
              onClick={() => {
                try {
                  localStorage.removeItem("sc_recent_searches");
                } catch {
                  /* ignore */
                }
                toast({ title: "Cleared", description: "Your recent searches are gone." });
              }}
            />
            <ListRow
              icon={RotateCcw}
              title="Reset location"
              chevron={false}
              onClick={() => {
                try {
                  localStorage.removeItem("sc_user_state");
                } catch {
                  /* ignore */
                }
                window.dispatchEvent(new CustomEvent("sc-location-change", { detail: null }));
                toast({ title: "Location reset", description: "You'll see activities from all states." });
              }}
            />
          </ListGroup>

          <ListGroup title="About">
            <ListRow icon={BookOpen} sport="guide" title="Guides and rules" onClick={() => navigate("/guides")} />
            <ListRow icon={Mail} title="Support" subtitle="support@sportcliq.com" onClick={() => (window.location.href = "mailto:support@sportcliq.com")} />
            <ListRow icon={FileText} title="Terms and privacy" onClick={() => navigate("/terms-privacy")} />
            <ListRow icon={Info} title="App version" right={<span className="text-sm font-semibold text-sc-ink3">2.0</span>} chevron={false} />
          </ListGroup>

          <button
            type="button"
            onClick={signOut}
            className="h-[54px] rounded-full bg-sport-red-bg text-sport-red-fg font-bold flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> Sign out
          </button>
        </main>
        <LocationSheet open={locOpen} onOpenChange={setLocOpen} />
        <Navbar />
      </Screen>
    </>
  );
};

export default Settings;
