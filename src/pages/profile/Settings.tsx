import { useEffect, useState } from "react";
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
  Check,
  LayoutGrid,
  ShieldOff,
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { APP_MODES, setAppMode, useAppMode, type AppMode } from "@/lib/appMode";
import { blockedPeople, onBlockedChange, unblockPerson, type BlockedPerson } from "@/lib/safety";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const Settings = () => {
  const [confirmOut, setConfirmOut] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = useUserState();
  const [locOpen, setLocOpen] = useState(false);
  const appMode = useAppMode();
  const [modeOpen, setModeOpen] = useState(false);
  const [blocked, setBlocked] = useState<BlockedPerson[]>(() => blockedPeople());
  const [blockedOpen, setBlockedOpen] = useState(false);
  useEffect(() => {
    const off = onBlockedChange(() => setBlocked(blockedPeople()));
    return () => { off(); };
  }, []);
  const unblock = async (p: BlockedPerson) => {
    try {
      await unblockPerson(p.id);
      toast({ title: `${p.name} unblocked` });
    } catch (e: any) {
      toast({ title: "Could not unblock", description: e?.message, variant: "destructive" });
    }
  };
  const pickMode = async (m: AppMode) => {
    await setAppMode(m);
    setModeOpen(false);
    toast({ title: `${APP_MODES.find((x) => x.id === m)?.label} first`, description: "Your home screen now leads with it. Every other sport stays one tap away." });
  };
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

          <ListGroup title="App mode">
            <ListRow
              icon={LayoutGrid}
              sport="football"
              title={APP_MODES.find((m) => m.id === appMode)?.label || "Football"}
              subtitle="The sport SportCliq shows you first"
              right={<Pill sport="football">Change</Pill>}
              chevron={false}
              onClick={() => setModeOpen(true)}
            />
          </ListGroup>

          <ListGroup title="Account">
            <ListRow icon={CircleUserRound} title="Profile details" subtitle="Display name, email and password" onClick={() => navigate("/profile/account-details")} />
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
            <ListRow
              icon={ShieldOff}
              title="Blocked people"
              subtitle={blocked.length ? `${blocked.length} blocked` : "No one blocked"}
              onClick={() => setBlockedOpen(true)}
            />
          </ListGroup>

          <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
            <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[420px] rounded-[28px] bg-white p-6 gap-0">
              <DialogTitle className="text-xl font-extrabold text-sc-ink">Blocked people</DialogTitle>
              <DialogDescription className="text-sm text-sc-ink2 mt-1">You don't see matches or rides from people you block.</DialogDescription>
              <div className="flex flex-col gap-2 mt-5">
                {blocked.length === 0 ? (
                  <p className="text-sm text-sc-ink3 py-4 text-center">No one blocked. Use the flag on a match or ride to block an organiser.</p>
                ) : (
                  blocked.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-sc-bg px-4 py-3">
                      <span className="text-[15px] font-bold text-sc-ink truncate">{p.name}</span>
                      <button type="button" onClick={() => unblock(p)} className="h-9 px-4 rounded-full bg-white text-sc-ink text-[13px] font-bold shrink-0">Unblock</button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

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
        <Dialog open={modeOpen} onOpenChange={setModeOpen}>
          <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4">
            <div className="flex flex-col gap-1 pr-6">
              <DialogTitle className="text-xl font-extrabold text-sc-ink">Preferred app mode</DialogTitle>
              <DialogDescription className="text-sm text-sc-ink2">SportCliq puts this sport first on your home screen. You can still explore and join everything else.</DialogDescription>
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Preferred app mode">
              {APP_MODES.map((m) => {
                const on = m.id === appMode;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => pickMode(m.id)} className={`h-16 px-4 rounded-2xl bg-white flex items-center gap-3 text-left ${on ? "ring-2 ring-sc-green" : ""}`}>
                    <span className="flex-1 flex flex-col">
                      <span className="text-[15px] font-extrabold">{m.label}</span>
                      <span className="text-xs text-sc-ink3">{m.sub}</span>
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${on ? "bg-sc-green text-white" : "border-2 border-sc-line"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
        <Navbar />
      </Screen>
    </>
  );
};

export default Settings;
