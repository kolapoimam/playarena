import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Download,
  MapPin,
  Calendar,
  DollarSignIcon,
  Users,
  ChevronDown,
  Trophy,
  Volleyball,
  Medal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

type Landmark = {
  id: string;
  name: string;
  state: string;
  description?: string | null;
  map_link?: string | null;
};

type Attendee = {
  id: string;
  attendee_name: string;
  status: "registered" | "checked_in" | "absent";
};

type Event = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  start_landmark_id: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  start_landmark: Landmark;
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

interface CyclingDetailsDialogueProps {
  event: Event | null;
  attendees: Attendee[] | null;
}

const CyclingDetailsDialogue: React.FC<CyclingDetailsDialogueProps> = ({
  event,
  attendees,
}) => {
  const { toast } = useToast();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

  // Log props for debugging
  console.log('CyclingDetailsDialogue props:', { event, attendees });

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

      if (!blob) throw new Error("Failed to convert canvas to Blob");

      const filename = `SportCliq-Cycling-${(event?.title || 'Untitled-Event').replace(/\s+/g, '-')}.png`;
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
  }, [isImageLoaded, event, toast]);

  const handleShare = () => {
    const url = `${window.location.origin}/cycling/${event?.slug || ''}`;
    const shareText = `Join my cycling event: ${event?.title || 'Untitled Event'} at ${event?.start_landmark?.name || 'Unknown Location'}, ${event?.start_landmark?.state || 'Unknown State'} on ${formatDate(event?.event_date)} at ${event?.start_time || 'Unknown Time'}. ${attendees?.length || 0}/${event?.max_attendees || 0} spots taken. Powered by SportCliq. ${url}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Join Cycling: ${event?.title || 'Untitled Event'}`,
          text: shareText,
          url,
        })
        .then(() => {
          toast({
            title: "Shared!",
            description: "Event link shared successfully.",
          });
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          toast({
            title: "Error",
            description: "Failed to share the event.",
            variant: "destructive",
          });
        });
    } else {
      try {
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copied!",
          description: "Share it with your friends to join the event.",
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
    const url = `${window.location.origin}/cycling/${event?.slug || ''}`;
    const shareText = `Join my cycling event: ${event?.title || 'Untitled Event'} at ${event?.start_landmark?.name || 'Unknown Location'}, ${event?.start_landmark?.state || 'Unknown State'} on ${formatDate(event?.event_date)} at ${event?.start_time || 'Unknown Time'}. ${attendees?.length || 0}/${event?.max_attendees || 0} spots taken. Powered by SportCliq. ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/cycling/${event?.slug || ''}`;
    const shareText = `Join my cycling event: ${event?.title || 'Untitled Event'} at ${event?.start_landmark?.name || 'Unknown Location'}, ${event?.start_landmark?.state || 'Unknown State'} on ${formatDate(event?.event_date)} at ${event?.start_time || 'Unknown Time'}. ${attendees?.length || 0}/${event?.max_attendees || 0} spots taken. Powered by SportCliq. ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/cycling/${event?.slug || ''}`;
    const shareText = `Join my cycling event: ${event?.title || 'Untitled Event'} at ${event?.start_landmark?.name || 'Unknown Location'}, ${event?.start_landmark?.state || 'Unknown State'} on ${formatDate(event?.event_date)} at ${event?.start_time || 'Unknown Time'}. ${attendees?.length || 0}/${event?.max_attendees || 0} spots taken. Powered by SportCliq.`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
  };

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  // Fallback validation
  const isValid = event && attendees;
  if (!isValid) {
    console.warn('CyclingDetailsDialogue: Some props are missing, using fallbacks');
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
          onClick={() => setDownloadDialogOpen(true)}
          disabled={isDownloading}
          aria-label="Open download dialog"
        >
          <Download size={18} className="mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>
      <Dialog
        open={downloadDialogOpen}
        onOpenChange={(open) => {
          setDownloadDialogOpen(open);
          setIsImageLoaded(false);
          if (!open) setBackgroundColor('#4CAF50');
        }}
      >
        <DialogContent className="w-full max-w-[90vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">Event Details</DialogTitle>
          <DialogDescription className="flex flex-col items-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
              Download or share this card to invite friends to your cycling event.
              {!isValid && " Some event details may be missing."}
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
                        description: "Failed to load logo.",
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
                  {event?.title || 'Untitled Event'}
                </h2>
                <div className="text-center mb-4">
                  <p className="text-sm text-white">
                    <MapPin className="inline h-4 w-4 mr-1 text-white" /> 
                    {event?.start_landmark?.name || 'Unknown Location'}, {event?.start_landmark?.state || 'Unknown State'}
                  </p>
                  <p className="text-sm text-white">
                    <Calendar className="inline h-4 w-4 mr-1 text-white" /> 
                    {formatDate(event?.event_date)} at {formatTime(event?.start_time)}
                  </p>
                  <p className="text-sm text-white">
                    <DollarSignIcon className="inline h-4 w-4 mr-1 text-white" /> 
                    {event?.is_free || !event?.price ? "Free" : `₦${event.price.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-sm text-white">
                    <Users className="inline h-4 w-4 mr-1 text-white" /> 
                    {attendees?.length || 0}/{event?.max_attendees || 0} spots
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
              <strong>Note:</strong> Share this card to invite friends to your event.
            </p>
            <div className="flex justify-center w-full">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
                aria-label="Download cycling details card as image"
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

export default CyclingDetailsDialogue;
