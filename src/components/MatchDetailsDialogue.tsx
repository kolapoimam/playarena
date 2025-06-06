import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, Users, Trophy, Volleyball, Medal, Download, Share2, ChevronDown } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Venue = {
  slug: string;
  name: string;
  city: string;
};

type MatchDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    title: string;
    match_date: string;
    match_time: string;
    is_paid: boolean;
    price: number | null;
    total_slots: number;
    venue: Venue | null;
    slug?: string; // Added to support sharing URL
  } | null;
  totalPlayerSlots: number;
};

const MatchDetailsDialog = ({
  open,
  onOpenChange,
  match,
  totalPlayerSlots,
}: MatchDetailsDialogProps) => {
  const { toast } = useToast();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false); // Internal state for download dialog
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

  // Log props for debugging
  console.log('MatchDetailsDialog props:', {
    open,
    match,
    totalPlayerSlots,
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown Date";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "Unknown Time";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = async () => {
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

      const filename = `SportCliq-Event-${(match?.title || 'Untitled-Match').replace(/\s+/g, '-')}.png`;
      const url = URL.createObjectURL(blob);
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
        description: "Failed to download card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/match/${match?.slug || ''}`;
    const shareText = `Join my match: ${match?.title || 'Untitled Match'} at ${match?.venue?.name || 'Unknown Venue'}, ${match?.venue?.city || 'Unknown City'} on ${formatDate(match?.match_date)} at ${match?.match_time || 'Unknown Time'}. ${totalPlayerSlots}/${match?.total_slots || 0} spots taken. Powered by @SportCliq. ${url}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Join Match: ${match?.title || 'Untitled Match'}`,
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
      try {
        navigator.clipboard.writeText(shareText);
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
    const url = `${window.location.origin}/match/${match?.slug || ''}`;
    const shareText = `Join my match: ${match?.title || 'Untitled Match'} at ${match?.venue?.name || 'Unknown Venue'}, ${match?.venue?.city || 'Unknown City'} on ${formatDate(match?.match_date)} at ${match?.match_time || 'Unknown Time'}. ${totalPlayerSlots}/${match?.total_slots || 0} spots taken. Powered by @SportCliq. ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/match/${match?.slug || ''}`;
    const shareText = `Join my match: ${match?.title || 'Untitled Match'} at ${match?.venue?.name || 'Unknown Venue'}, ${match?.venue?.city || 'Unknown City'} on ${formatDate(match?.match_date)} at ${match?.match_time || 'Unknown Time'}. ${totalPlayerSlots}/${match?.total_slots || 0} spots taken. Powered by @SportCliq. ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/match/${match?.slug || ''}`;
    const shareText = `Join my match: ${match?.title || 'Untitled Match'} at ${match?.venue?.name || 'Unknown Venue'}, ${match?.venue?.city || 'Unknown City'} on ${formatDate(match?.match_date)} at ${match?.match_time || 'Unknown Time'}. ${totalPlayerSlots}/${match?.total_slots || 0} spots taken. Powered by @SportCliq.`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
  };

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  // If props are missing, use fallback values but keep dialog open
  const isValid = match;
  if (!isValid) {
    console.warn('MatchDetailsDialog: Some props are missing, using fallbacks');
  }

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
            <DropdownMenuItem onClick={handleShare}>
              Share via Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setDownloadDialogOpen(true)} // Toggle internal state
          disabled={isDownloading}
          aria-label="Open download dialog"
        >
          <Download size={18} className="mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>
      <Dialog
        open={downloadDialogOpen} // Use internal state
        onOpenChange={(newOpen) => {
          if (!newOpen && !isDownloading) {
            setDownloadDialogOpen(false);
            onOpenChange(false); // Sync with parent if needed
          }
        }}
      >
        <DialogContent className="w-full max-w-[90vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">Match Details</DialogTitle>
          <DialogDescription className="flex flex-col items-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
              Download or share this card to invite friends to your match.
              {!isValid && " Some match details may be missing."}
            </p>
            <div className="relative w-full max-w-md">
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
              <div
                ref={cardRef}
                className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl mx-auto overflow-hidden border-4 border-dashed border-white/30 animate-ticket-reveal mt-4"
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
                    alt="SportCliq Logo"
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
                <div className="flex items-center justify-around mb-4">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                  <Volleyball className="h-6 w-6 text-red-500" />
                  <Medal className="h-6 w-6 text-blue-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">
                  {match?.title || 'Untitled Match'}
                </h2>
                <div className="text-center mb-4">
                  <p className="text-sm">
                    <MapPin className="inline h-4 w-4 mr-1" /> {match?.venue?.name || 'Unknown Venue'}, {match?.venue?.city || 'Unknown City'}
                  </p>
                  <p className="text-sm">
                    <Calendar className="inline h-4 w-4 mr-1" /> {formatDate(match?.match_date)} at {formatTime(match?.match_time)}
                  </p>
                  <p className="text-sm">
                    <DollarSign className="inline h-4 w-4 mr-1" /> {match?.is_paid && match?.price ? `₦${match.price.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Free"}
                  </p>
                  <p className="text-sm">
                    <Users className="inline h-4 w-4 mr-1" /> {totalPlayerSlots}/{match?.total_slots || 0} spots
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
              <strong>Note:</strong> Share this card to invite friends to your match.
            </p>
            <div className="flex justify-center w-full">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
                aria-label="Download match details card as image"
              >
                <Download size={16} className="mr-2" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatchDetailsDialog;
