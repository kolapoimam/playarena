import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

// Import all page components
import Index from "@/pages/Index";
import Search from "@/pages/Search";
import Activities from "@/pages/Activities";
import Matches from "@/pages/Matches";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import ViewProfile from "@/pages/ViewProfile";
import NotFound from "@/pages/NotFound";
import Organize from "@/pages/Organize";
import MatchDetail from "@/pages/MatchDetail";
import JoinMatch from "@/pages/JoinMatch";
import VenueDetail from "@/pages/VenueDetail";
import VenueCreate from "@/pages/VenueCreate";
import MatchRedirect from "@/pages/MatchRedirect";
import VenueRedirect from "@/pages/VenueRedirect";
import VenueDirectory from "@/pages/VenueDirectory";
import ConfirmCheckin from "@/pages/ConfirmCheckin";
import Feedback from "@/pages/Feedback";
import Guides from "@/pages/Guides";
import Auth from "@/pages/Auth";
import TeamManagement from "@/pages/TeamManagement";
import MatchHighlights from "@/components/MatchHighlights";
import Ticketing from "@/pages/Ticketing";
import TermsAndPrivacy from "@/pages/TermsAndPrivacy";
import Confirm from "@/pages/Confirm";
import VenueManagerDashboard from "@/pages/VenueManagerDashboard";
import VenueBookings from "@/pages/VenueBookings";
import VenueBookingForm from "@/components/VenueBookingForm";
import MyVenue from "@/pages/MyVenue";
import MyBookings from "@/pages/MyBookings";
import BookingCode from "@/pages/BookingCode";
import AccountDetails from "@/pages/AccountDetails";
import MyMatches from "@/pages/MyMatches";
import MyCycling from "@/pages/MyCycling";
import MatchPreferences from "@/pages/MatchPreferences";
import Wallet from "@/pages/Wallet";
import CyclingActivity from "@/pages/CyclingActivity";
import CyclingDetail from "@/pages/CyclingDetail";
import JoinCycling from "@/pages/JoinCycling";
import HostCycling from "@/pages/HostCycling";
import LandmarkDirectory from "@/pages/LandmarkDirectory";
import LandmarkDetail from "@/pages/LandmarkDetail";
import AuthCallback from "@/pages/AuthCallback";

// Import admin components
import AdminLogin from "@/pages/admin/AdminLogin";
import FirstTimeSetup from '@/pages/admin/FirstTimeSetup';
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUserManagement from "@/pages/admin/AdminUserManagement";
import EventManagement from "@/pages/admin/EventManagement";
import CashoutManagement from "@/pages/admin/CashoutManagement";
import VenueManagement from "@/pages/admin/VenueManagement";
import AnalyticsDashboard from "@/pages/admin/AnalyticsDashboard";
import AuditLog from "@/pages/admin/AuditLog";
import NotificationManagement from '@/pages/admin/NotificationManagement';
import AdminProfile from '@/pages/admin/AdminProfile';

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
            clearInterval Owners: checkInterval);
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
      console.log('Supabase Auth Event:', { event, userId });
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
    <Routes>
      {/* Non-Admin Routes Wrapped in MobileOnlyGuard */}
      <Route element={<MobileOnlyGuard />}>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<Search />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/cycling-activities" element={<CyclingActivity />} />
        <Route path="/guides" element={<Guides />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/view-profile" element={<ViewProfile />} />
        <Route path="/profile/notifications" element={<Notifications />} />
        <Route path="/profile/account-details" element={<AccountDetails />} />
        <Route path="/profile/my-matches" element={<MyMatches />} />
        <Route path="/profile/my-cycling" element={<MyCycling />} />
        <Route path="/profile/match-preferences" element={<MatchPreferences />} />
        <Route path="/profile/wallet" element={<Wallet />} />
        <Route path="/profile/my-venue" element={<MyVenue />} />
        <Route path="/profile/my-bookings" element={<MyBookings />} />
        <Route path="/profile/booking-code" element={<BookingCode />} />
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
      </Route>

      {/* Admin Routes (Not Wrapped in MobileOnlyGuard) */}
      <Route path="/admin/setup" element={<FirstTimeSetup />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <Navigate to="/admin/dashboard" replace />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedAdminRoute>
          <AdminUserManagement />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/events" element={
        <ProtectedAdminRoute>
          <EventManagement />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/cashouts" element={
        <ProtectedAdminRoute>
          <CashoutManagement />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/venues" element={
        <ProtectedAdminRoute>
          <VenueManagement />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedAdminRoute>
          <AnalyticsDashboard />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedAdminRoute>
          <AuditLog />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/notifications" element={
        <ProtectedAdminRoute>
          <NotificationManagement />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/profile" element={
        <ProtectedAdminRoute>
          <AdminProfile />
        </ProtectedAdminRoute>
      } />
      {/* Fallback for NotFound outside MobileOnlyGuard to avoid conflicts */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

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
            <AppRoutes />
            <InstallPrompt />
          </Router>
        </TooltipProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
};

// Admin route protection component
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  
  if (!adminSession.id) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default App;
