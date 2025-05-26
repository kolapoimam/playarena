import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import SplashScreen from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import * as gtag from "@/lib/gtag";
import { supabase } from "@/integrations/supabase/client";

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
import MatchPreferences from "@/pages/MatchPreferences";
import Wallet from "@/pages/Wallet";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const oneSignalInitialized = useRef(false);

  useEffect(() => {
    console.log("Current path:", location.pathname);
    gtag.pageview(location.pathname + location.search);
  }, [location]);

  // OneSignal initialization and user tagging effect
  useEffect(() => {
    const initializeAndTagOneSignal = async () => {
      // Prevent multiple initializations
      if (oneSignalInitialized.current) {
        console.log("OneSignal already initialized, skipping...");
        return;
      }

      // Wait for OneSignal to load and be fully initialized
      const waitForOneSignal = () => {
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            console.log("Checking for OneSignal...", window.OneSignal);
            if (window.OneSignal && window.OneSignal.isInitialized) {
              clearInterval(checkInterval);
              resolve(true);
            } else if (window.OneSignal) {
              console.log("OneSignal loaded but not initialized:", window.OneSignal);
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            console.log("OneSignal load timeout, window.OneSignal:", window.OneSignal);
            resolve(false);
          }, 15000); // Increased to 15 seconds
        });
      };

      const isOneSignalLoaded = await waitForOneSignal();
      if (!isOneSignalLoaded || !window.OneSignal) {
        console.log("OneSignal failed to load or initialize within 15 seconds");
        return;
      }

      // Initialize OneSignal only if not already initialized
      try {
        if (!window.OneSignal.isInitialized) {
          console.log("Attempting to initialize OneSignal with appId:", import.meta.env.VITE_ONESIGNAL_APP_ID);
          await new Promise((resolve, reject) => {
            window.OneSignal.init({
              appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerPath: '/OneSignalSDKWorker.js',
              serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
            }).then(() => {
              console.log("OneSignal initialized successfully");
              oneSignalInitialized.current = true;
              resolve();
            }).catch((error) => {
              console.error("OneSignal initialization error:", error);
              reject(error);
            });
          });
        } else {
          console.log("OneSignal already initialized by another script");
        }

        // Wait for notification permission method to be available
        const waitForPermissionMethod = () => {
          return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (window.OneSignal && window.OneSignal.getNotificationPermission) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
            setTimeout(() => {
              clearInterval(checkInterval);
              console.log("getNotificationPermission not available after 5 seconds");
              resolve(false);
            }, 5000);
          });
        };

        const isPermissionAvailable = await waitForPermissionMethod();
        if (isPermissionAvailable && window.OneSignal.getNotificationPermission) {
          window.OneSignal.getNotificationPermission((permission) => {
            if (permission !== "granted") {
              console.log("Showing OneSignal slidedown prompt for permission");
              window.OneSignal.showSlidedownPrompt();
            } else {
              console.log("Notification permission already granted:", permission);
            }
          });
        }

        // Wait for tagging methods to be available
        const waitForTaggingMethods = () => {
          return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (window.OneSignal && window.OneSignal.setExternalUserId) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
            setTimeout(() => {
              clearInterval(checkInterval);
              console.log("setExternalUserId not available after 5 seconds");
              resolve(false);
            }, 5000);
          });
        };

        const isTaggingAvailable = await waitForTaggingMethods();
        if (isTaggingAvailable && window.OneSignal.setExternalUserId) {
          const tagUserWithOneSignal = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            if (!userId) {
              console.log("No user session available for OneSignal tagging");
              return;
            }

            console.log("Tagging OneSignal with user_id:", userId);
            window.OneSignal.setExternalUserId(userId);
            window.OneSignal.sendTag("user_id", userId, (tagsSent) => {
              console.log("Tags sent to OneSignal:", tagsSent);
            });
          };

          // Tag user when auth state changes
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user?.id) {
              tagUserWithOneSignal();
            }
          });

          // Initial tag attempt
          tagUserWithOneSignal();

          return () => {
            authListener.subscription.unsubscribe();
          };
        } else {
          console.log("OneSignal not fully initialized for tagging after 5 seconds");
        }
      } catch (error) {
        console.error("OneSignal setup error:", error);
      }
    };

    initializeAndTagOneSignal();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/search" element={<Search />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/guides" element={<Guides />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/view-profile" element={<ViewProfile />} />
      <Route path="/profile/notifications" element={<Notifications />} />
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
