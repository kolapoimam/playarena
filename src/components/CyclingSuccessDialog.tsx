import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, Trophy, User, Bike, Share2, Download, ChevronDown, Volleyball, Medal } from "lucide-react";
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

  // Validate props
  const isValid = open &&
    code &&
    formValues?.title &&
    formValues?.start_time &&
    formValues?.host_name &&
    selectedLandmark &&
    selectedLandmark.name &&
    selectedLandmark.state &&
    eventSlug;

  // Handle invalid props
  if (!isValid) {
    if (open) {
      console.error('Invalid props in CyclingSuccessDialog, closing dialog');
      toast({
        title: "Error",
        description: "Some event information is missing. Event was created successfully.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
    return null; // Prevent rendering if props are invalid
  }

  // Format event date safely
  const formattedDate = formValues.event_date
    ? (formValues.event_date instanceof Date
        ? format(formValues.event_date, "PPP")
        : typeof formValues.event_date === 'string'
          ? formValues.event_date
          : 'Unknown Date')
    : 'Unknown Date';

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

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}`;
    if (navigator.share) {
      navigator
        .share({
          title: "My SportCliq Cycling Event",
          text: shareText,
          url: shareUrl,
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
    const shareUrl = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const shareUrl = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const shareUrl = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Join my cycling event: ${formValues.title} on ${formattedDate} at ${formValues.start_time}. ${supercode ? `Supercode: ${supercode}` : `Confirmation Code: ${confirmationCode}`}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
  };

  const isDarkBackground = ['#4CAF50', '#000000', '#2196F3', '#9C27B0'].includes(backgroundColor);
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

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
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download size={18} className="mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen && !isDownloading) {
            onNavigate?.();
          }
          onOpenChange(newOpen);
        }}
      >
        <DialogContent className="w-full max-w-[90vw] sm:max-w-[500px] rounded-2xl p-4 sm:p-6">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">
            {supercode ? "Event Created Successfully!" : "Joined Event Successfully!"}
          </DialogTitle>
          <DialogDescription className="flex flex-col items-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
              {supercode
                ? "Your cycling event has been created. Below is your unique 6-digit supercode for check-ins."
                : "You have joined the cycling event. Below is your 6-digit confirmation code for check-in."}
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
                className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl mx-auto overflow-hidden border-4 border-dashed border-white/30 animate-ticket-reveal"
                style={{
                  backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                  backgroundSize: '40px 40px',
                  clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)',
                  backgroundColor,
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
                  <Volleyball className="h-6 w-6 text-red-500" />
                  <Medal className="h-6 w-6 text-blue-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">
                  {formValues.title ?? 'Untitled Event'}
                </h2>
                <div className="text-center mb-4">
                  <p className="text-sm">
                    <MapPin className="inline h-4 w-4 mr-1 text-white" /> 
                    {selectedLandmark.name ?? 'Unknown Location'}, {selectedLandmark.state ?? 'Unknown State'}
                  </p>
                  <p className="text-sm">
                    <CalendarIcon className="inline h-4 w-4 mr-1 text-white" /> 
                    {formattedDate}
                  </p>
                  <p className="text-sm">
                    <Clock className="inline h-4 w-4 mr-1 text-white" /> 
                    {formValues.start_time ?? 'Unknown Time'}
                  </p>
                  <p className="text-sm font-semibold">
                    <User className="inline h-4 w-4 mr-1 text-white" /> 
                    Hosted by {formValues.host_name ?? 'Unknown Host'}
                  </p>
                </div>
                <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
                  <p className="text-sm font-medium uppercase tracking-wide">
                    {supercode ? "Supercode" : "Confirmation Code"}
                  </p>
                  <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{code}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
              <strong>Note:</strong> Save or download this code for check-in on event day.
            </p>
            <div className="flex justify-center w-full">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
                aria-label="Download cycling card as image"
              >
                <Download size={16} className="mr-2" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </div>
            <div className="flex justify-center mt-4">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={() => {
                  if (!isDownloading) {
                    onOpenChange(false);
                    onNavigate?.();
                  }
                }}
                disabled={isDownloading}
              >
                Go to Events
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CyclingSuccessDialog;
