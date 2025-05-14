import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
  Download,
  ChevronDown,
  ExternalLink,
  Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { format, addHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from "html2canvas";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  player_number_required: boolean;
  is_private: boolean;
  access_password: string | null;
  status: string;
  cancellation_status: boolean;
  skill_level?: string;
  match_type?: string;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    map_link: string | null;
  } | null;
  players: {
    player_name: string;
    status: string;
    number_of_slots: number;
    cancellation_status: boolean;
  }[];
};

const MatchDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundOption, setBackgroundOption] = useState("field");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    checkMatchAccess(slug);
  }, [slug]);

  const checkMatchAccess = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(id, slug, name, city, map_link),
          players(player_name, status, number_of_slots, cancellation_status)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      const matchData = data as Match;
      if (matchData.is_private && !localStorage.getItem(`match_access_${matchSlug}`)) {
        setPasswordDialogOpen(true);
        setLoading(false);
      } else {
        setMatch(matchData);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const verifyPassword = async () => {
    if (!slug) {
      navigate("/matches");
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .select("access_password, is_private")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      if (!data.is_private || data.access_password === password) {
        localStorage.setItem(`match_access_${slug}`, "true");
        setPasswordDialogOpen(false);
        fetchMatch(slug);
      } else {
        toast({
          title: "Error",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      toast({
        title: "Error",
        description: "Failed to verify access. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMatch = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(id, slug, name, city, map_link),
          players(player_name, status, number_of_slots, cancellation_status)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      setMatch(data as Match);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getMatchStatus = () => {
    if (!match) return { statusLabel: "", statusClass: "", isFull: false, isFeedbackWindow: false };

    const matchDateTime = new Date(`${match.match_date}T${match.match_time}:00Z`);
    const now = new Date();
    const fortyEightHoursAfter = addHours(matchDateTime, 48);

    let statusLabel = "";
    let statusClass = "";
    let isFeedbackWindow = false;

    if (match.cancellation_status) {
      statusLabel = "Cancelled";
      statusClass = "bg-red-100 text-red-800";
    } else {
      switch (match.status) {
        case "cancelled":
          statusLabel = "Cancelled";
          statusClass = "bg-red-100 text-red-800";
          break;
        case "completed":
          statusLabel = "Completed";
          statusClass = "bg-gray-100 text-gray-800";
          isFeedbackWindow = now >= matchDateTime && now < fortyEightHoursAfter;
          break;
        case "live":
          statusLabel = "Live";
          statusClass = "bg-green-100 text-green-800 animate-pulse";
          break;
        case "upcoming":
          statusLabel = format(matchDateTime, "yyyy-MM-dd") === format(now, "yyyy-MM-dd") ? "Today" : "Upcoming";
          statusClass = format(matchDateTime, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
            ? "bg-green-100 text-green-700"
            : "bg-blue-100 text-blue-800";
          break;
        default:
          statusLabel = "Upcoming";
          statusClass = "bg-blue-100 text-blue-800";
      }
    }

    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const isFull = totalPlayerSlots >= match.total_slots;

    return { statusLabel, statusClass, isFull, isFeedbackWindow };
  };

  const shareMatch = async () => {
    if (!match) return;

    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Football Match: ${match.title}`,
          text: shareText,
          url: url,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copied!",
          description: "Share it with your friends to join the match.",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Please try again or copy the URL manually.",
          variant: "destructive",
        });
      }
    }
  };

  const shareToWhatsApp = () => {
    if (!match) return;

    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    if (!match) return;

    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    if (!match) return;

    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce(
      (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
      0
    );
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${match?.title}-match-details.png`;
      link.click();
      setDownloadDialogOpen(false);
      toast({
        title: "Download started",
        description: "Your match details image is being downloaded.",
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { statusLabel, statusClass, isFull, isFeedbackWindow } = getMatchStatus();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">Match not found.</p>
      </div>
    );
  }

  const totalPlayerSlots = match.players.reduce(
    (sum, player) => sum + (player.cancellation_status ? 0 : player.number_of_slots || 1),
    0
  );

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">{match.title}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-green-600">
                <Share2 size={18} className="mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={shareMatch}>Copy Link</DropdownMenuItem>
              <DropdownMenuItem onClick={shareToWhatsApp}>Share to WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={shareToTwitter}>Share to Twitter</DropdownMenuItem>
              <DropdownMenuItem onClick={shareToFacebook}>Share to Facebook</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDownloadDialogOpen(true)}>
                Download Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        <div className="border rounded-lg p-6 bg-white dark:bg-gray-800 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {match.title}
              {match.is_private && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock size={16} className="inline ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a private match</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h2>
            <Badge className={statusClass}>{statusLabel}</Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar size={18} />
              <span>{formatDate(match.match_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock size={18} />
              <span>{formatTime(match.match_time)}</span>
            </div>
            {match.venue && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin size={18} />
                <a
                  href={`/venue/${match.venue.slug}`}
                  className="text-green-500 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/venue/${match.venue.slug}`);
                  }}
                >
                  {match.venue.name}, {match.venue.city}
                </a>
                {match.venue.map_link && (
                  <a
                    href={match.venue.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-green-500 hover:underline"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users size={18} />
              <span>
                {totalPlayerSlots}/{match.total_slots} slots filled
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>
                {match.is_paid ? `₦${match.price?.toFixed(2)}` : "Free"}
              </span>
            </div>
            {match.skill_level && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span>Skill Level: {match.skill_level}</span>
              </div>
            )}
            {match.match_type && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span>Match Type: {match.match_type}</span>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Organized by: <span className="font-medium">{match.organizer_name}</span>
              </p>
            </div>
            {match.notes && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notes: {match.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Players</h3>
            {match.players.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {match.players.map((player, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span>{player.player_name} {player.number_of_slots > 1 ? `(+${player.number_of_slots - 1})` : ""}</span>
                    <Badge
                      className={
                        player.cancellation_status
                          ? "bg-red-100 text-red-800"
                          : player.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {player.cancellation_status ? "Cancelled" : formatStatus(player.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">No players registered yet.</p>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            {isFeedbackWindow ? (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => navigate(`/feedback?matchId=${match.id}`)}
              >
                Give Feedback
              </Button>
            ) : (match.cancellation_status || match.status === "cancelled" || match.status === "completed" || isFull) ? (
              <Button
                className="flex-1 bg-gray-500 text-white"
                disabled
              >
                {match.cancellation_status || match.status === "cancelled"
                  ? "Cancelled"
                  : match.status === "completed"
                  ? "Completed"
                  : "Full"}
              </Button>
            ) : (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => navigate(`/join/${match.slug}`)}
              >
                Join Match
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
              onClick={() => navigate("/organize")}
            >
              Organize Similar
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Private Match</DialogTitle>
            <DialogDescription>
              This match is private. Please enter the access password to view details.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && verifyPassword()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate("/matches")}>
              Cancel
            </Button>
            <Button onClick={verifyPassword}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Match Details</DialogTitle>
            <DialogDescription>
              Choose a background for your match details image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Background</label>
              <select
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={backgroundOption}
                onChange={(e) => setBackgroundOption(e.target.value)}
              >
                <option value="field">Football Field</option>
                <option value="stadium">Stadium</option>
                <option value="plain">Plain</option>
              </select>
            </div>
            <div
              ref={cardRef}
              className={`p-6 rounded-lg ${
                backgroundOption === "field"
                  ? "bg-[url('/field-bg.jpg')]"
                  : backgroundOption === "stadium"
                  ? "bg-[url('/stadium-bg.jpg')]"
                  : "bg-gray-100 dark:bg-gray-800"
              } bg-cover bg-center text-gray-900 dark:text-gray-100`}
            >
              <img
                src={backgroundOption === "field" ? "/field-bg.jpg" : backgroundOption === "stadium" ? "/stadium-bg.jpg" : ""}
                onLoad={handleImageLoad}
                className="hidden"
                alt=""
              />
              <h3 className="text-xl font-bold">{match.title}</h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>Status: {statusLabel}</p>
                <p>Date: {formatDate(match.match_date)}</p>
                <p>Time: {formatTime(match.match_time)}</p>
                <p>Venue: {match.venue?.name}, {match.venue?.city}</p>
                <p>Slots: {totalPlayerSlots}/{match.total_slots}</p>
                <p>{match.is_paid ? `₦${match.price?.toFixed(2)}` : "Free"}</p>
                <p>Organized by: {match.organizer_name}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={!isImageLoaded}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navbar />
    </div>
  );
};

export default MatchDetail;
