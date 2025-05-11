// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main App Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Search />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/venue-create" element={<VenueCreate />} />

          {/* Slug-Based Routes for Matches and Venues */}
          <Route path="/match/:slug" element={<MatchDetail />} />
          <Route path="/join/:slug" element={<JoinMatch />} />
          <Route path="/join-match/:slug" element={<JoinMatch />} /> {/* Added for backward compatibility */}
          <Route path="/venue/:slug" element={<VenueDetail />} />

          {/* Redirect Routes for Backward Compatibility */}
          <Route path="/match-id/:id" element={<MatchRedirect />} />
          <Route path="/venue-id/:id" element={<VenueRedirect />} />

          {/* Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
