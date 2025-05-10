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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Search />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/match/:slug" element={<MatchDetail />} />
          <Route path="/join/:slug" element={<JoinMatch />} />
          <Route path="/venue/:slug" element={<VenueDetail />} />
          <Route path="/venue-create" element={<VenueCreate />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/match-id/:id" element={<MatchRedirect />} />
<Route path="/venue-id/:id" element={<VenueRedirect />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
