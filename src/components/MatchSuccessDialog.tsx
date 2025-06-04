import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Trophy, Share2, Download, ChevronDown, Volleyball, Medal } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FormValues = {
  title: string;
  match_date: Date | undefined;
  start_time: string;
  end_time: string;
  organizer_name: string;
  is_private: boolean;
  access_password: string | null | undefined;
};

type Venue = {
  id: string;
  name: string;
};

type MatchSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: FormValues;
  selectedVenue: Venue | undefined;
  supercode: string | null;
  matchSlug: string | null;
  onNavigate: (slug: string) => void;
};

const MatchSuccessDialog = ({ open, onOpenChange, formValues, selectedVenue, supercode, matchSlug, onNavigate }: MatchSuccessDialogProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    const url = matchSlug ? `${window.location.origin}/match/${matchSlug}` : window.location.origin;
    const shareText = `Join my match: ${formValues.title} at ${selectedVenue?.name || 'unknown venue'} on ${formValues.match_date ? format(formValues.match_date, "PPP") : 'unknown date'} from ${formValues.start_time} to ${formValues.end_time}. Supercode: ${supercode}. Powered by SportCliq.${formValues.is_private ? ` Access Password: ${formValues.access_password}` : ''}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Join ${formValues.title}`,
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
    const url = matchSlug ? `${window.location.origin}/match/${matchSlug}` : window.location.origin;
    const shareText = `Join my match: ${formValues.title} at ${selectedVenue?.name || 'unknown venue'} on ${formValues.match_date ? format(formValues.match_date, "PPP") : 'unknown date'} from ${formValues.start_time} to ${formValues.end_time}. Supercode: ${supercode}. Powered by SportCliq.${formValues.is_private ? ` Access Password: ${formValues.access_password}` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = matchSlug ? `${window.location.origin}/match/${matchSlug}` : window.location.origin;
    const shareText = `Join my match: ${formValues.title} at ${selectedVenue?.name || 'unknown venue'} on ${formValues.match_date ? format(formValues.match_date, "PPP") : 'unknown date'} from ${formValues.start_time} to ${formValues.end_time}. Supercode: ${supercode}. Powered by SportCliq.${formValues.is_private ? ` Access Password: ${formValues.access_password}` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = matchSlug ? `${window.location.origin}/match/${matchSlug}` : window.location.origin;
    const shareText = `Join my match: ${formValues.title} at ${selectedVenue?.name || 'unknown venue'} on ${formValues.match_date ? format(formValues.match_date, "PPP") : 'unknown date'} from ${formValues.start_time} to ${formValues.end_time}. Supercode: ${supercode}. Powered by SportCliq.${formValues.is_private ? ` Access Password: ${formValues.access_password}` : ''}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
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

      const filename = `SportCliq-Supercode-${formValues.title.replace(/\s+/g, '-')}.png`;
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
        description: "Failed to download supercode card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <>
      <div className="flex gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(open) => {
        if (!open && matchSlug) {
          onNavigate(matchSlug);
        }
        onOpenChange(open);
      }}>
        <DialogContent className="w-full max-w-[90vw] sm:max-w-[500px] rounded-2xl p-4 sm:p-6">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">Match Created Successfully!</DialogTitle>
          <DialogDescription className="flex flex-col items-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
              Your match has been created. Below is your unique 6-digit Supercode for check-ins on match day.
              {formValues.is_private && " Also, share the access password with invited players."}
            </p>
            <div className="relative w-full max-w-md">
              <div
                ref={cardRef}
                className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl mx-auto overflow-hidden border-4 border-dashed border-white/30 animate-ticket-reveal"
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
                <div className="flex items-center justify-around mb-4">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                  <Volleyball className="h-6 w-6 text-red-500" />
                  <Medal className="h-6 w-6 text-blue-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">{formValues.title || "Your Match"}</h2>
                <div className="text-center mb-4">
                  <p className="text-sm"><MapPin className="inline h-4 w-4 mr-1" /> {selectedVenue?.name || "Venue"}</p>
                  <p className="text-sm"><CalendarIcon className="inline h-4 w-4 mr-1" /> {formValues.match_date ? format(formValues.match_date, "PPP") : "Date"}</p>
                  <p className="text-sm"><Clock className="inline h-4 w-4 mr-1" /> From {formValues.start_time || "Start"} to {formValues.end_time || "End"}</p>
                  <p className="text-sm"><User className="inline h-4 w-4 mr-1" /> Organized by {formValues.organizer_name || "Organizer"}</p>
                  {formValues.is_private && (
                    <p className="text-sm font-semibold">Access Password: <span className="font-mono">{formValues.access_password || "N/A"}</span></p>
                  )}
                </div>
                <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
                  <p className="text-sm font-medium uppercase tracking-wide">Supercode</p>
                  <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{supercode || "N/A"}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
              <strong>Note:</strong> Save or share this code. You'll need it on match day.
              {formValues.is_private && " Share the access password with invited players to allow them to join."}
            </p>
            <div className="flex justify-center w-full">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
                aria-label="Download supercode card as image"
              >
                <Download size={16} className="mr-2" />
                {isDownloading ? "Downloading..." : "Download Supercode"}
              </Button>
            </div>
            <div className="flex justify-center mt-4">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={() => {
                  if (!isDownloading && matchSlug) {
                    onOpenChange(false);
                    onNavigate(matchSlug);
                  }
                }}
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

export default MatchSuccessDialog;
