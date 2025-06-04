
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Download,
  Bike,
  MapPin,
  Calendar,
  DollarSignIcon,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  event: Event;
  attendees: Attendee[];
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

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/cycling/${event.slug}`;
    const shareText = `Join my cycling event: ${event.title} at ${event.start_landmark.name}, ${event.start_landmark.state} on ${formatDate(event.event_date)} at ${event.start_time}. ${attendees.length}/${event.max_attendees} spots taken. Powered by SportCliq. ${url}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Join Cycling: ${event.title}`,
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
        description: "Card is not ready for download.",
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
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn("Failed to load logo");
          resolve();
        };
      });

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/png")
      );

      if (!blob) throw new Error("Failed to convert canvas to Blob");

      const filename = `SportCliq-Cycling-${event.title.replace(/\s+/g, "-")}.png`;
      const url = URL.createObjectURL(blob);

      if (
        navigator.share &&
        navigator.canShare({
          files: [new File([blob], filename, { type: "image/png" })],
        })
      ) {
        try {
          await navigator.share({
            files: [new File([blob], filename, { type: "image/png" })],
            title: event.title,
            text: `Join my cycling event at ${event.start_landmark.name}!`,
          });
          URL.revokeObjectURL(url);
          return;
        } catch (shareError) {
          console.warn("Share failed:", shareError);
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [isImageLoaded, event, toast, backgroundColor]);

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <>
      <div className="flex justify-center gap-4 px-6 py-4 mt-4">
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
      <Dialog
        open={downloadDialogOpen}
        onOpenChange={(open) => {
          setDownloadDialogOpen(open);
          setIsImageLoaded(false);
          if (!open) setBackgroundColor('#4CAF50');
        }}
      >
        <DialogContent className="sm:max-w-[425px] rounded-lg">
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download or share this card to invite friends to your cycling event.
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
                  <Bike className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">{event.title}</h2>
                <div className="text-center mb-4">
                  <p className="text-sm"><MapPin className="inline h-4 w-4 mr-1" /> {event.start_landmark.name}, {event.start_landmark.state}</p>
                  <p className="text-sm"><Calendar className="inline h-4 w-4 mr-1" /> {formatDate(event.event_date)} at {event.start_time}</p>
                  <p className="text-sm"><DollarSignIcon className="inline h-4 w-4 mr-1" /> {event.is_free ? "Free" : event.price ? `₦${event.price.toLocaleString("en-NG")}` : "Paid"}</p>
                  <p className="text-sm"><Users className="inline h-4 w-4 mr-1" /> {attendees.length}/{event.max_attendees} spots booked</p>
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
              <strong>Note:</strong> Share this card to invite friends to your event.
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

export default CyclingDetailsDialogue;
