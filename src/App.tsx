import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from '@mantine/core';
import Index from "./pages/Index";
import Search from "./pages/Search";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Organize from "./pages/Organize";
import MatchDetail from "./pages/MatchDetail";
import JoinMatch from "./pages/JoinMatch";
import VenueDetail from "./pages/VenueDetail";
import VenueCreate from "./pages/VenueCreate";
import MatchRedirect from "./pages/MatchRedirect";
import VenueRedirect from "./pages/VenueRedirect";
import VenueDirectory from "./pages/VenueDirectory";
import ConfirmCheckin from "./pages/ConfirmCheckin";
import Feedback from "./pages/Feedback";
import Guides from "./pages/Guides";
import ScrollToTop from "./components/ScrollToTop";
import { Routes, Route } from 'react-router-dom';
import TeamManagement from "./pages/TeamManagement"; // Import the new page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <TooltipProvider>
        <Toaster />
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Main App Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/organize" element={<Organize />} />
            <Route path="/venue-create" element={<VenueCreate />} />
            <Route path="/venues" element={<VenueDirectory />} />
            <Route path="/confirm-checkin" element={<ConfirmCheckin />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* Slug-Based Routes for Matches and Venues */}
            <Route path="/match/:slug" element={<MatchDetail />} />
            <Route path="/join/:slug" element={<JoinMatch />} />
            <Route path="/venue/:slug" element={<VenueDetail />} />
            <Route path="/team-management/:slug" element={<TeamManagement />} /> {/* New route for TeamManagement */}

            {/* Redirect Routes for Backward Compatibility */}
            <Route path="/match-id/:id" element={<MatchRedirect />} />
            <Route path="/venue-id/:id" element={<VenueRedirect />} />

            {/* Catch-All Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </MantineProvider>
  </QueryClientProvider>
);

export default App;
