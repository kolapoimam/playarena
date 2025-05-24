import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import { useState, useEffect } from 'react';

import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";

import Index from "@/pages/Index";
import Search from "@/pages/Search";
import Activities from "@/pages/Activities";
import Matches from "@/pages/Matches";
import Profile from "@/pages/Profile";
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
import MatchPreferences from "@/pages/MatchPreferences";
import Wallet from "@/pages/Wallet";

import * as gtag from "@/lib/gtag";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    console.log("Current path:", location.pathname);
    gtag.pageview(location.pathname + location.search);
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/search" element={<Search />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/guides" element={<Guides />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/view-profile" element={<ViewProfile />} />
      <Route
        path="/profile/account-details"
        element={<AccountDetails profile={profile} setProfile={setProfile} />}
      />
      <Route path="/profile/my-matches" element={<MyMatches profile={profile} />} />
      <Route path="/profile/match-preferences" element={<MatchPreferences />} />
      <Route path="/profile/wallet" element={<Wallet />} />
      <Route path="/profile/my-venue" element={<MyVenue />} />
      <Route path="/profile/my-bookings" element={<MyBookings />} />
      <Route path="/profile/booking-code" element={<BookingCode />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route path="/organize" element={<Organize />} />
      <Route path="/venue-create" element={<VenueCreate />} />
      <Route path="/venues" element={<VenueDirectory />} />
      <Route path="/confirm-checkin" element={<ConfirmCheckin />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/ticketing/:slug/*" element={<Ticketing />} />
      <Route path="/terms-privacy" element={<TermsAndPrivacy />} />
      <Route path="/match/:slug" element={<MatchDetail />} />
      <Route path="/join/:slug" element={<JoinMatch />} />
      <Route path="/venue/:slug" element={<VenueDetail />} />
      <Route path="/match/:slug/team-management" element={<TeamManagement />} />
      <Route path="/highlights/:slug" element={<MatchHighlights />} />
      <Route path="/match-id/:id" element={<MatchRedirect />} />
      <Route path="/venue-id/:id" element={<VenueRedirect />} />
      <Route path="/venuemanager/dashboard/:venueId" element={<VenueManagerDashboard />} />
      <Route path="/venues-bookings/:venueSlug" element={<VenueBookings />} />
      <Route path="/venue/:slug/book" element={<VenueBookingForm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
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
      <MantineProvider withGlobalStyles withNormalizeCSS>
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

export default App;
