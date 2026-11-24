import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";
import { pageview } from "@/lib/analytics";
import { linkPushUser, listenPushClicks } from "@/lib/onesignal";
import { ensureProfile, takeAuthError } from "@/lib/ensureProfile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MobileOnlyGuard from "@/components/MobileOnlyGuard";

// Import page components
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import AppErrorBoundary from "@/components/sc/AppErrorBoundary";
import SwipeBack from "@/components/sc/SwipeBack";
import RequireAuth from "@/components/sc/RequireAuth";


// Screens load on demand so the first open is quick. If a deploy replaced a file
// while the app was open, reload once to pick up the new version.
function load<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const key = "sc_chunk_reload";
  return lazy(() =>
    factory().then((m) => { sessionStorage.removeItem(key); return m; }).catch((err) => {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}

const Search = load(() => import("@/pages/Search"));
const Activities = load(() => import("@/pages/gameManagement/Activities"));
const Matches = load(() => import("@/pages/match/Matches"));
const Profile = load(() => import("@/pages/profile/Profile"));
const Notifications = load(() => import("@/pages/profile/Notifications"));
const Inbox = load(() => import("@/pages/Inbox"));
const ViewProfile = load(() => import("@/pages/profile/ViewProfile"));
const ResetPassword = load(() => import("@/pages/ResetPassword"));
const Organize = load(() => import("@/pages/gameManagement/Organize"));
const MatchDetail = load(() => import("@/pages/match/MatchDetail"));
const JoinMatch = load(() => import("@/pages/match/JoinMatch"));
const VenueDetail = load(() => import("@/pages/venueManagement/VenueDetail"));
const VenueCreate = load(() => import("@/pages/venueManagement/VenueCreate"));
const MatchRedirect = load(() => import("@/pages/match/MatchRedirect"));
const VenueRedirect = load(() => import("@/pages/venueManagement/VenueRedirect"));
const VenueDirectory = load(() => import("@/pages/venueManagement/VenueDirectory"));
const ConfirmCheckin = load(() => import("@/pages/gameManagement/ConfirmCheckin"));
const Feedback = load(() => import("@/pages/gameManagement/Feedback"));
const Guides = load(() => import("@/pages/Guides"));
const Auth = load(() => import("@/pages/Auth"));
const TeamManagement = load(() => import("@/pages/matchManagement/TeamManagement"));
const MatchHighlights = load(() => import("@/components/match/MatchHighlights"));
const Ticketing = load(() => import("@/pages/gameManagement/Ticketing"));
const TermsAndPrivacy = load(() => import("@/pages/TermsAndPrivacy"));
const Confirm = load(() => import("@/pages/gameManagement/Confirm"));
const VenueManagerDashboard = load(() => import("@/pages/venueManagement/VenueManagerDashboard"));
const VenueBookings = load(() => import("@/pages/venueManagement/VenueBookings"));
const VenueBookingForm = load(() => import("@/components/venueManagement/VenueBookingForm"));
const MyVenue = load(() => import("@/pages/venueManagement/MyVenue"));
const MyBookings = load(() => import("@/pages/profile/MyBookings"));
const BookingCode = load(() => import("@/pages/venueManagement/BookingCode"));
const AccountDetails = load(() => import("@/pages/profile/AccountDetails"));
const MyMatches = load(() => import("@/pages/profile/MyMatches"));
const MyCycling = load(() => import("@/pages/profile/MyCycling"));
const MatchPreferences = load(() => import("@/pages/match/MatchPreferences"));
const Wallet = load(() => import("@/pages/profile/Wallet"));
const CyclingActivity = load(() => import("@/pages/cycling/CyclingActivity"));
const CyclingDetail = load(() => import("@/pages/cycling/CyclingDetail"));
const JoinCycling = load(() => import("@/pages/cycling/JoinCycling"));
const HostCycling = load(() => import("@/pages/cycling/HostCycling"));
const LandmarkDirectory = load(() => import("@/pages/cycling/LandmarkDirectory"));
const LandmarkDetail = load(() => import("@/pages/cycling/LandmarkDetail"));
const AuthCallback = load(() => import("@/pages/AuthCallback"));
const Settings = load(() => import("@/pages/profile/Settings"));
const Badges = load(() => import("@/pages/profile/Badges"));
const Onboarding = load(() => import("@/components/sc/Onboarding"));

// The main tabs are fetched in the background after the first screen shows,
// so moving between them feels instant.
const warmTabs = () => {
  import("@/pages/profile/Profile");
  import("@/pages/gameManagement/Activities");
  import("@/pages/Search");
  import("@/pages/match/Matches");
  import("@/pages/cycling/CyclingActivity");
  import("@/pages/match/MatchDetail");
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false, retry: 1 } },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-sc-bg font-sans px-4 pt-6 animate-pulse" aria-busy="true">
    <div className="h-8 w-40 rounded-xl bg-black/[0.06]" />
    <div className="mt-6 h-32 rounded-3xl bg-black/[0.05]" />
    <div className="mt-3 h-20 rounded-3xl bg-black/[0.05]" />
    <div className="mt-3 h-20 rounded-3xl bg-black/[0.05]" />
  </div>
);

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    pageview(location.pathname + location.search);
  }, [location]);

  // Link this device to the signed in user for OneSignal push
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      linkPushUser(data.session?.user?.id);
      ensureProfile(data.session?.user);
    });
    listenPushClicks();
    // A sign in that failed on the server comes back with the error in the address
    if (!window.location.pathname.startsWith("/auth/callback")) {
      const authError = takeAuthError();
      if (authError) toast({ title: "Sign in did not finish", description: authError, variant: "destructive" });
    }
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") localStorage.removeItem("sc_profile_cache");
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") linkPushUser(session?.user?.id);
      if (event === "SIGNED_IN") setTimeout(() => ensureProfile(session?.user), 0);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <AppErrorBoundary key={location.pathname}>
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/search" element={<Search />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/cycling-activities" element={<CyclingActivity />} />
      <Route path="/guides" element={<Guides />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/view-profile" element={<ViewProfile />} />
      <Route path="/profile/notifications" element={<Notifications />} />
      <Route path="/notifications" element={<Inbox />} />
      <Route path="/inbox" element={<Navigate to="/notifications" replace />} />
      <Route
        path="/profile/account-details"
        element={<AccountDetails />}
      />
      <Route path="/profile/my-matches" element={<MyMatches />} />
      <Route path="/profile/my-cycling" element={<MyCycling />} />
      <Route path="/profile/match-preferences" element={<MatchPreferences />} />
      <Route path="/profile/wallet" element={<Wallet />} />
      <Route path="/profile/my-venue" element={<MyVenue />} />
      <Route path="/profile/my-bookings" element={<MyBookings />} />
      <Route path="/profile/booking-code" element={<BookingCode />} />
      <Route path="/profile/settings" element={<Settings />} />
      <Route path="/profile/badges" element={<Badges />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route path="/organize" element={<RequireAuth kind="organise"><Organize /></RequireAuth>} />
      <Route path="/host-cycling" element={<RequireAuth kind="host"><HostCycling /></RequireAuth>} />
      <Route path="/venue-create" element={<RequireAuth kind="venue"><VenueCreate /></RequireAuth>} />
      <Route path="/venues" element={<VenueDirectory />} />
      <Route path="/landmarks" element={<LandmarkDirectory />} />
      <Route path="/confirm-checkin" element={<ConfirmCheckin />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/ticketing/:slug/*" element={<Ticketing />} />
      <Route path="/terms-privacy" element={<TermsAndPrivacy />} />
      <Route path="/match/:slug" element={<MatchDetail />} />
      <Route path="/join/:slug" element={<JoinMatch />} />
      <Route path="/cycling/:slug" element={<CyclingDetail />} />
      <Route path="/join-cycling/:slug" element={<JoinCycling />} />
      <Route path="/venue/:slug" element={<VenueDetail />} />
      <Route path="/landmark/:slug" element={<LandmarkDetail />} />
      <Route path="/match/:slug/team-management" element={<TeamManagement />} />
      <Route path="/highlights/:slug" element={<MatchHighlights />} />
      <Route path="/match-id/:id" element={<MatchRedirect />} />
      <Route path="/venue-id/:id" element={<VenueRedirect />} />
      <Route path="/venuemanager/dashboard/:venueId" element={<VenueManagerDashboard />} />
      <Route path="/venues-bookings/:venueSlug" element={<VenueBookings />} />
      <Route path="/venue/:slug/book" element={<RequireAuth kind="book"><VenueBookingForm /></RequireAuth>} />
      <Route path="/cycling-event/:slug" element={<CyclingDetail />} />
      <Route path="/feedback/cycling/:slug" element={<LegacyRideFeedback />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </AppErrorBoundary>
  );
};

function LegacyRideFeedback() {
  const { slug } = useParams();
  return <Navigate to={`/cycling/${slug}`} replace />;
}

const App = () => {
  // The splash shows once per session, briefly, while the app loads behind it.
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('seenSplash'));

  useEffect(() => {
    const idle = (window as any).requestIdleCallback || ((fn: () => void) => setTimeout(fn, 1200));
    idle(warmTabs);
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('seenSplash', 'true');
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <ScrollToTop />
            <MobileOnlyGuard>
              <AppRoutes />
              <SwipeBack />
              <Suspense fallback={null}><Onboarding /></Suspense>
              <InstallPrompt />
            </MobileOnlyGuard>
          </Router>
          {showSplash && <SplashScreen />}
        </TooltipProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default App;
