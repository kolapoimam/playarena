import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import { useState, useEffect } from 'react';
import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import * as gtag from "@/lib/gtag";
import { supabase } from "@/integrations/supabase/client";
import MobileOnlyGuard from "@/components/MobileOnlyGuard";

// Import page components
import Index from "@/pages/Index";
import Search from "@/pages/Search";
import Activities from "@/pages/gameManagement/Activities";
import Matches from "@/pages/match/Matches";
import Profile from "@/pages/profile/Profile";
import Notifications from "@/pages/profile/Notifications";
import ViewProfile from "@/pages/profile/ViewProfile";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import AppErrorBoundary from "@/components/sc/AppErrorBoundary";
import Organize from "@/pages/gameManagement/Organize";
import MatchDetail from "@/pages/match/MatchDetail";
import JoinMatch from "@/pages/match/JoinMatch";
import VenueDetail from "@/pages/venueManagement/VenueDetail";
import VenueCreate from "@/pages/venueManagement/VenueCreate";
import MatchRedirect from "@/pages/match/MatchRedirect";
import VenueRedirect from "@/pages/venueManagement/VenueRedirect";
import VenueDirectory from "@/pages/venueManagement/VenueDirectory";
import ConfirmCheckin from "@/pages/gameManagement/ConfirmCheckin";
import Feedback from "@/pages/gameManagement/Feedback";
import Guides from "@/pages/Guides";
import Auth from "@/pages/Auth";
import TeamManagement from "@/pages/matchManagement/TeamManagement";
import MatchHighlights from "@/components/match/MatchHighlights";
import Ticketing from "@/pages/gameManagement/Ticketing";
import TermsAndPrivacy from "@/pages/TermsAndPrivacy";
import Confirm from "@/pages/gameManagement/Confirm";
import VenueManagerDashboard from "@/pages/venueManagement/VenueManagerDashboard";
import VenueBookings from "@/pages/venueManagement/VenueBookings";
import VenueBookingForm from "@/components/venueManagement/VenueBookingForm";
import MyVenue from "@/pages/venueManagement/MyVenue";
import MyBookings from "@/pages/profile/MyBookings";
import BookingCode from "@/pages/venueManagement/BookingCode";
import AccountDetails from "@/pages/profile/AccountDetails";
import MyMatches from "@/pages/profile/MyMatches";
import MyCycling from "@/pages/profile/MyCycling";
import MatchPreferences from "@/pages/match/MatchPreferences";
import Wallet from "@/pages/profile/Wallet";
import CyclingActivity from "@/pages/cycling/CyclingActivity";
import CyclingDetail from "@/pages/cycling/CyclingDetail";
import JoinCycling from "@/pages/cycling/JoinCycling";
import HostCycling from "@/pages/cycling/HostCycling";
import LandmarkDirectory from "@/pages/cycling/LandmarkDirectory";
import LandmarkDetail from "@/pages/cycling/LandmarkDetail";
import AuthCallback from "@/pages/AuthCallback";
import Settings from "@/pages/profile/Settings";
import Badges from "@/pages/profile/Badges";
import Onboarding from "@/components/sc/Onboarding";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    console.log("Current path:", location.pathname);
    gtag.pageview(location.pathname + location.search);
  }, [location]);

  // OneSignal user tagging effect
  useEffect(() => {
    // Wait for OneSignal to initialize
    const waitForOneSignal = () => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.OneSignal && window.OneSignal.initialized) {
            clearInterval(checkInterval);
            console.log("OneSignal fully initialized");
            resolve(true);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          console.log("OneSignal initialization timeout after 10 seconds");
          resolve(false);
        }, 10000);
      });
    };

    // Listen for auth state changes to ensure we tag the user after login
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const userId = session?.user?.id;
      if (userId && window.OneSignal) {
        // Wait for OneSignal to be fully initialized
        const isInitialized = await waitForOneSignal();
        if (!isInitialized) {
          console.log("OneSignal not initialized, skipping login and tagging");
          return;
        }

        console.log("Tagging OneSignal with user_id:", userId);
        window.OneSignal.push(() => {
          if (window.OneSignal) {
            window.OneSignal.login(userId);
            console.log("OneSignal login triggered for user_id:", userId);
            window.OneSignal.User.addTag("user_id", userId);
            console.log("Tag added to OneSignal: user_id =", userId);
          }
        });
      } else {
        console.log("No user session or OneSignal not loaded:", { userId, OneSignal: !!window.OneSignal });
      }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AppErrorBoundary key={location.pathname}>
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
      <Route path="/organize" element={<Organize />} />
      <Route path="/host-cycling" element={<HostCycling />} />
      <Route path="/venue-create" element={<VenueCreate />} />
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
      <Route path="/venue/:slug/book" element={<VenueBookingForm />} />
      <Route path="/cycling-event/:slug" element={<CyclingDetail />} />
      <Route path="/feedback/cycling/:slug" element={<LegacyRideFeedback />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </AppErrorBoundary>
  );
};

function LegacyRideFeedback() {
  const { slug } = useParams();
  return <Navigate to={`/cycling/${slug}`} replace />;
}

const App = () => {
  useGoogleAnalytics();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem('seenSplash');

    if (seen) {
      setShowSplash(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('seenSplash', 'true');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      console.log("PWA was installed");
      gtag.event("app_installed", {
        event_category: "PWA",
        event_label: "User installed the PWA",
      });
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <ScrollToTop />
            <MobileOnlyGuard>
              <AppRoutes />
              <Onboarding />
              <InstallPrompt />
            </MobileOnlyGuard>
          </Router>
        </TooltipProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default App;
