import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import { useState, useEffect } from 'react';

import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop"; // Updated to use @ alias
import InstallPrompt from "@/components/InstallPrompt"; // Updated to use @ alias

import Index from "@/pages/Index"; // Updated to use @ alias
import Search from "@/pages/Search"; // Updated to use @ alias
import Activities from "@/pages/Activities"; // Updated to use @ alias
import Matches from "@/pages/Matches"; // Updated to use @ alias
import Profile from "@/pages/Profile"; // Updated to use @ alias
import NotFound from "@/pages/NotFound"; // Updated to use @ alias
import Organize from "@/pages/Organize"; // Updated to use @ alias
import MatchDetail from "@/pages/MatchDetail"; // Updated to use @ alias
import JoinMatch from "@/pages/JoinMatch"; // Updated to use @ alias
import VenueDetail from "@/pages/VenueDetail"; // Updated to use @ alias
import VenueCreate from "@/pages/VenueCreate"; // Updated to use @ alias
import MatchRedirect from "@/pages/MatchRedirect"; // Updated to use @ alias
import VenueRedirect from "@/pages/VenueRedirect"; // Updated to use @ alias
import VenueDirectory from "@/pages/VenueDirectory"; // Updated to use @ alias
import ConfirmCheckin from "@/pages/ConfirmCheckin"; // Updated to use @ alias
import Feedback from "@/pages/Feedback"; // Updated to use @ alias
import Guides from "@/pages/Guides"; // Updated to use @ alias
import Auth from "@/pages/Auth"; // Updated to use @ alias
import TeamManagement from "@/pages/TeamManagement"; // Updated to use @ alias
import Ticketing from "@/pages/Ticketing"; // Updated to use @ alias
import TermsAndPrivacy from "@/pages/TermsAndPrivacy"; // Updated to use @ alias
import Confirm from "@/pages/Confirm"; // Updated to use @ alias
import VenueManagerDashboard from "@/pages/VenueManagerDashboard"; // Updated to use @ alias
import VenueBookings from "@/components/VenueBookings"; // Kept as is
import VenueBookingForm from "@/components/VenueBookingForm"; // Added import

import * as gtag from "@/lib/gtag"; // Updated to use @ alias

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
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
