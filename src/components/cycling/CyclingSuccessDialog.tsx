import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Bike, Share2, Download, Trophy, Medal } from "lucide-react";
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
  event_date?: Date | string | null;
  start_time: string;
  host_name: string;
};

type Landmark = {
  id?: string;
  name?: string;
  state?: string;
};

type CyclingSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: FormValues;
  selectedLandmark: Landmark;
  supercode?: string | null;
  confirmationCode?: string | null;
  eventSlug?: string;
  onNavigate?: () => void;
};

const CyclingSuccessDialog = ({
  open,
  onOpenChange,
  formValues,
  selectedLandmark,
  supercode,
  confirmationCode,
  eventSlug,
  onNavigate,
}: CyclingSuccessDialogProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

  const code = supercode || confirmationCode;

  // Log props for debugging
  console.log('CyclingSuccessDialog props:', {
    open,
    code,
    formValues,
    selectedLandmark,
    eventSlug,
    onNavigate,
  });

  // Relaxed prop validation with fallbacks
  const isValid = open && code && formValues?.title && formValues?.start_time && formValues?.host_name && selectedLandmark?.name && eventSlug;
  if (!isValid && open) {
    console.error('Invalid props in CyclingSuccessDialog, closing dialog');
    toast({
      title: "Error",
      description: "Some event information is missing. Event was created successfully.",
      variant: "destructive",
    });
    onOpenChange(false);
    return null;
  }

  const formattedDate = formValues.event_date
    ? (formValues.event_date instanceof Date
        ? format(formValues.event_date, "PPP")
        : typeof formValues.event_date === 'string'
          ? formValues.event_date
          : 'Unknown Date')
    : 'Unknown Date';

  const handleShare = () => {
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}. Powered by SportCliq.`;
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
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}. Powered by SportCliq.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}. Powered by SportCliq.`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}. Powered by SportCliq.`;
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

      const filename = `SportCliq-${supercode ? "Supercode" : "ConfirmationCode"}-${formValues.title.replace(/\s+/g, '-')}.png`;
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

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && !isDownloading && eventSlug) {
          onNavigate?.();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="w-full max-w-[90vw] sm:max-w-[500px] rounded-2xl p-4 sm:p-6">
        <DialogTitle className="text-xl font-bold text-sc-ink dark:text-white text-center">
          {supercode ? "Event Created Successfully!" : "Joined Event Successfully!"}
        </DialogTitle>
        <DialogDescription className="flex flex-col items-center">
          <p className="text-sc-ink3 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
            {supercode
              ? "Your cycling event has been created. Below is your unique 6-digit supercode for check-ins."
              : "You have joined the cycling event. Below is your 6-digit confirmation code for check-in."}
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
                <Bike className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-around mb-4">
                <Trophy className="h-6 w-6 text-yellow-300" />
                <Bike className="h-6 w-6 text-red-500" />
                <Medal className="h-6 w-6 text-blue-300" />
              </div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">{formValues.title || 'Untitled Event'}</h2>
              <div className="text-center mb-4">
                <p className="text-sm"><MapPin className="inline h-4 w-4 mr-1" /> {selectedLandmark.name || 'Unknown Location'}, {selectedLandmark.state || 'Unknown State'}</p>
                <p className="text-sm"><CalendarIcon className="inline h-4 w-4 mr-1" /> {formattedDate}</p>
                <p className="text-sm"><Clock className="inline h-4 w-4 mr-1" /> {formValues.start_time || 'Unknown Time'}</p>
                <p className="text-sm"><User className="inline h-4 w-4 mr-1" /> Hosted by {formValues.host_name || 'Unknown Host'}</p>
              </div>
              <div className="bg-white text-sc-green-dark rounded-md p-4 text-center shadow-inner">
                <p className="text-sm font-medium uppercase tracking-wide">{supercode ? "Supercode" : "Confirmation Code"}</p>
                <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{code}</p>
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
          <p className="text-sm text-sc-ink3 dark:text-gray-400 my-4 text-center max-w-xs">
            <strong>Note:</strong> Save or share this code. You'll need it on event day.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
            <Button 
              className="bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-6 py-3 shadow-card transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
              onClick={handleDownload}
              disabled={!isImageLoaded || isDownloading}
              aria-label="Download event card as image"
            >
              <Download size={16} className="mr-2" />
              {isDownloading ? "Downloading..." : "Download Code"}
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default CyclingSuccessDialog;
