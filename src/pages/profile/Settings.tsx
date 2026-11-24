import { useState } from "react";
import ConfirmModal from "@/components/sc/ConfirmModal";
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
import { withOneSignal, linkPushUser } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import usePWAInstallPrompt from "@/hooks/usePWAInstallPrompt";
import { ListGroup, ListRow, NavHeader, Pill, Screen } from "@/components/sc/ui";
import { LocationSheet, useUserState } from "@/components/sc/location";
import { resetOnboarding } from "@/components/sc/Onboarding";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const Settings = () => {
  const [confirmOut, setConfirmOut] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = useUserState();
  const [locOpen, setLocOpen] = useState(false);
  const { isInstallable, triggerInstall } = usePWAInstallPrompt();
  const installed = isStandalone();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const [pushState, setPushState] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  const enablePush = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Not supported", description: isIOS ? "Install SportCliq to your home screen first, then turn on alerts." : "This browser can't show notifications." });
      return;
    }
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        if (!OneSignal.User.PushSubscription.optedIn) await OneSignal.User.PushSubscription.optIn();
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) linkPushUser(data.session.user.id);
      } finally {
        setPushState(Notification.permission);
      }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sc_profile_cache");
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
            <ListRow
              icon={Bell}
              sport="tennis"
              title="Push alerts"
              subtitle={pushState === "granted" ? "On for this device" : pushState === "denied" ? "Blocked. Allow notifications in your browser settings" : "Match reminders and payment updates"}
              chevron={false}
              onClick={pushState === "granted" || pushState === "denied" ? undefined : enablePush}
              right={pushState === "granted" ? <Pill sport="football">On</Pill> : pushState === "denied" ? <Pill sport="red">Blocked</Pill> : <Pill sport="tennis">Turn on</Pill>}
            />
            <ListRow icon={Bell} title="Notification preferences" subtitle="Choose which reminders you get" onClick={() => navigate("/profile/notifications")} />
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
            <ListRow icon={Mail} title="Support" subtitle="sportcliqapp@gmail.com" onClick={() => (window.location.href = "mailto:sportcliqapp@gmail.com")} />
            <ListRow icon={FileText} title="Terms and privacy" onClick={() => navigate("/terms-privacy")} />
            <ListRow icon={Info} title="App version" right={<span className="text-sm font-semibold text-sc-ink3">2.0</span>} chevron={false} />
          </ListGroup>

          <button
            type="button"
            onClick={() => setConfirmOut(true)}
            className="h-[54px] rounded-full bg-sport-red-bg text-sport-red-fg font-bold flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> Sign out
          </button>
        </main>
        <LocationSheet open={locOpen} onOpenChange={setLocOpen} />
        <ConfirmModal
          open={confirmOut}
          onOpenChange={setConfirmOut}
          icon={LogOut}
          tone="danger"
          title="Sign out of SportCliq?"
          description="You can sign back in any time with your email."
          confirmLabel="Sign out"
          onConfirm={signOut}
        />
        <Navbar />
      </Screen>
    </>
  );
};

export default Settings;
