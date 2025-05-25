import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Download, 
  ChevronDown,
  Trophy,
  MapPin,
  Calendar,
  DollarSign,
  Users
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
  const [backgroundOption, setBackgroundOption] = useState("field");
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

  const shareMatch = async () => {
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by Sport Cliq. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    
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
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by Sport Cliq. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by Sport Cliq. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by Sport Cliq. ${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
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
      const logoSrc = backgroundOption === "white" ? "/playarenalight.png" : "/playarenadark.png";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn("Failed to load logo image for canvas");
          resolve(null);
        };
      });

      if (backgroundOption === "field") {
        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        bgImg.src = "/football-field.jpg";
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = () => {
            console.warn("Failed to load background image for canvas");
            resolve(null);
          };
        });
      }

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
  }, [isImageLoaded, match, toast, backgroundOption]);

  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  return (
    <>
      <div className="flex gap-3 mt-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1"
            >
              <Share2 size={18} className="mr-2" />
              Share
              <ChevronDown size={16} className="ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={shareToWhatsApp}>
              Share to WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToTwitter}>
              Share to Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToFacebook}>
              Share to Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareMatch}>
              Share via Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline"
          className="flex-1"
          onClick={() => setDownloadDialogOpen(true)}
          disabled={isDownloading}
        >
          <Download size={18} className="mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>

      <Dialog open={downloadDialogOpen} onOpenChange={(open) => {
        setDownloadDialogOpen(open);
        setIsImageLoaded(false);
        if (!open) setBackgroundOption("field");
      }}>
        <DialogContent className="sm:max-w-[425px] max-w-[90vw] rounded-2xl">
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download this card to share your match details with friends. Choose any background below.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Background:</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="field"
                    checked={backgroundOption === "field"}
                    onChange={() => setBackgroundOption("field")}
                    className="form-radio text-playarena-500"
                    disabled={isDownloading}
                  />
                  <span>Default</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="white"
                    checked={backgroundOption === "white"}
                    onChange={() => setBackgroundOption("white")}
                    className="form-radio text-playarena-500"
                    disabled={isDownloading}
                  />
                  <span>White</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="green"
                    checked={backgroundOption === "green"}
                    onChange={() => setBackgroundOption("green")}
                    className="form-radio text-playarena-500"
                    disabled={isDownloading}
                  />
                  <span>Green</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="black"
                    checked={backgroundOption === "black"}
                    onChange={() => setBackgroundOption("black")}
                    className="form-radio text-playarena-500"
                    disabled={isDownloading}
                  />
                  <span>Black</span>
                </label>
              </div>
            </div>
            <div 
              ref={cardRef}
              className={`rounded-lg shadow-lg w-full min-h-[400px] flex flex-col box-sizing-border-box ${backgroundOption === "field" ? "bg-cover bg-center" : ""}`}
              style={{
                backgroundImage: backgroundOption === "field" ? "url('/football-field.jpg')" : "",
                backgroundColor: backgroundOption !== "field" ? backgroundOption : "transparent",
                ...(backgroundOption === "field" && {
                  backgroundBlendMode: "overlay",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                }),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <img 
                    src={backgroundOption === "white" ? "/playarenalight.png" : "/playarenadark.png"}
                    alt="PlayArena Logo" 
                    className="h-8 w-auto"
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
                  <Trophy className={`h-6 w-6 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match.title}</h2>
                </div>
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="inline-flex items-center">
                    <MapPin className={`h-4 w-4 mr-2 flex-shrink-0 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={`leading-tight ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
                  </div>
                  <div className="inline-flex items-center">
                    <Calendar className={`h-4 w-4 mr-2 flex-shrink-0 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={`leading-tight ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{formatDate(match.match_date)} at {formatTime(match.match_time)}</span>
                  </div>
                  <div className="inline-flex items-center">
                    <DollarSign className={`h-4 w-4 mr-2 flex-shrink-0 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={`leading-tight ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match.is_paid ? `Paid (₦${match.price?.toFixed(2)})` : "Free"}</span>
                  </div>
                  <div className="inline-flex items-center">
                    <Users className={`h-4 w-4 mr-2 flex-shrink-0 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={`leading-tight ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{totalPlayerSlots}/{match.total_slots} slots booked</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or share this card to invite players to your match.
            </p>
            <div className="flex gap-2">
              <Button 
                className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
              <Button 
                className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
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
