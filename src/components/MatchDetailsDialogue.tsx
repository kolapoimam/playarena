import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Download, 
  Trophy,
  MapPin,
  Calendar,
  DollarSign,
  Users
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  map_link: string | null;
};

type Player = {
  player_name: string;
  player_status: 'Registered' | 'Checked In' | 'Absent';
  number_of_slots: number;
};

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  is_private: boolean;
  access_password: string | null;
  venue: Venue | null;
  players: Player[];
};

interface MatchDetailsDialogueProps {
  match: Match;
}

const MatchDetailsDialogue: React.FC<MatchDetailsDialogueProps> = ({ match }) => {
  const { toast } = useToast();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleShare = () => {
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by Sport Cliq. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Join my Football Match: ${match.title}`,
          text: shareText,
          url,
        })
        .then(() => {
          toast({
            title: "Shared!",
            description: "Match link shared successfully.",
          });
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          toast({
            title: "Error",
            description: "Failed to share the match.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Sharing Not Supported",
        description: "Your browser does not support sharing. Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({
        title: "Error",
        description: "Card is not ready for download. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const logoSrc = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0' ? "/playarenadark.png" : "/playarenalight.png";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn("Failed to load logo image for canvas");
          resolve(null);
        };
      });

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/png")
      );

      if (!blob) {
        throw new Error("Failed to convert canvas to Blob");
      }

      const filename = `SportCliq-Match-${match.title.replace(/\s+/g, '-')}.png`;
      const url = URL.createObjectURL(blob);

      if (navigator.share && (navigator as any).canShare?.({ files: [new File([blob], filename, { type: "image/png" })] })) {
        try {
          await navigator.share({
            files: [new File([blob], filename, { type: "image/png" })],
            title: match.title,
            text: `Join my match at ${match.venue?.name || 'unknown venue'}!`,
          });
          URL.revokeObjectURL(url);
          return;
        } catch (shareError) {
          console.warn("Share API failed, falling back to download:", shareError);
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download match card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [isImageLoaded, match, toast, backgroundColor]);

  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <>
      <div className="flex justify-center gap-4 px-6 py-4 mt-6">
        <Button
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs"
          onClick={handleShare}
          disabled={isDownloading}
        >
          <Share2 size={16} className="mr-2" />
          Share
        </Button>
        <Button
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs"
          onClick={() => setDownloadDialogOpen(true)}
          disabled={isDownloading}
        >
          <Download size={16} className="mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>

      <Dialog open={downloadDialogOpen} onOpenChange={(open) => {
        setDownloadDialogOpen(open);
        setIsImageLoaded(false);
        if (!open) setBackgroundColor('#4CAF50');
      }}>
        <DialogContent className="sm:max-w-[425px] max-w-[90vw] rounded-2xl">
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download this card to share your match details with friends.
            </p>
            <div className="relative">
              <div 
                ref={cardRef}
                className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl max-w-md mx-auto overflow-hidden border-4 border-dashed border-white/30"
                style={{
                  backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                  backgroundSize: '40px 40px',
                  clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)',
                  backgroundColor: backgroundColor,
                }}
              >
                {/* Perforated Edge Semi-Circles */}
                <div className="absolute top-0 left-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '20%' }} />
                <div className="absolute top-0 left-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '50%' }} />
                <div className="absolute top-0 left-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '80%' }} />
                <div className="absolute top-0 right-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '20%' }} />
                <div className="absolute top-0 right-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '50%' }} />
                <div className="absolute top-0 right-[-12px] w-6 h-6 bg-white/20 rounded-full" style={{ top: '80%' }} />

                {/* Ticket Content */}
                <div className="flex items-center justify-between mb-4">
                  <img 
                    src={logoSrc}
                    alt="PlayArena Logo" 
                    className="h-10 w-auto"
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    onError={() => {
                      toast({
                        title: "Error",
                        description: "Failed to load logo image.",
                        variant: "destructive",
                      });
                      setIsImageLoaded(true);
                    }}
                  />
                  <Trophy className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">{match.title}</h2>
                <div className="text-center mb-4">
                  <p className="text-sm"><MapPin className="inline h-4 w-4 mr-1" /> {match.venue?.name || "Venue"}, {match.venue?.city || ""}</p>
                  <p className="text-sm"><Calendar className="inline h-4 w-4 mr-1" /> {formatDate(match.match_date)} at {formatTime(match.match_time)}</p>
                  <p className="text-sm"><DollarSign className="inline h-4 w-4 mr-1" /> {match.is_paid ? `Paid (₦${match.price?.toFixed(2)})` : "Free"}</p>
                  <p className="text-sm"><Users className="inline h-4 w-4 mr-1" /> {totalPlayerSlots}/{match.total_slots} slots booked</p>
                  {match.is_private && (
                    <p className="text-sm font-semibold">Access Password: <span className="font-mono">{match.access_password || "N/A"}</span></p>
                  )}
                </div>
              </div>
              <select
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="mt-4 w-full p-2 border rounded-lg"
              >
                <option value="#4CAF50">Green</option>
                <option value="#FF5722">Orange</option>
                <option value="#2196F3">Blue</option>
                <option value="#9C27B0">Purple</option>
                <option value="#000000">Black</option>
              </select>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center">
              <strong>Note:</strong> Save or share this card to invite players to your match.
            </p>
            <div className="flex justify-center gap-4 px-6 py-4">
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
              >
                <Download size={16} className="mr-2" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs"
                onClick={handleShare}
                disabled={isDownloading}
              >
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
            </div>
            <div className="flex justify-center">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={() => setDownloadDialogOpen(false)}
                disabled={isDownloading}
              >
                Close
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatchDetailsDialogue;
