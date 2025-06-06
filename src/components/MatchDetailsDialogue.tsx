import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, Users, Trophy, Volleyball, Medal, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

type Venue = {
  slug: string;
  name: string;
  city: string;
};

type MatchJoinersDialogProps = {
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
  } | null;
  confirmationCode: string | null;
  selectedSlots: number;
  totalPlayerSlots: number;
};

const MatchJoinersDialog = ({
  open,
  onOpenChange,
  match,
  confirmationCode,
  selectedSlots,
  totalPlayerSlots,
}: MatchJoinersDialogProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

  // Log props for debugging
  console.log('MatchJoinersDialog props:', {
    open,
    match,
    confirmationCode,
    selectedSlots,
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

      const filename = `SportCliq-ConfirmationCode-${(match?.title || 'Untitled-Match').replace(/\s+/g, '-')}.png`;
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

  // If props are missing, use fallback values but keep dialog open
  const isValid = match && confirmationCode;
  if (!isValid) {
    console.warn('MatchJoinersDialog: Some props are missing, using fallbacks');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && !isDownloading) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="w-full max-w-[90vw] sm:max-w-[500px] rounded-2xl p-4 sm:p-6">
        <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">
          Registration Successful
        </DialogTitle>
        <DialogDescription className="flex flex-col items-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm text-center max-w-xs">
            You have successfully registered for the match for {selectedSlots} slot{selectedSlots > 1 ? "s" : ""}.
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
                  <DollarSign className="inline h-4 w-4 mr-1" /> {match?.is_paid && match?.price ? `Paid (₦${match.price.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x${selectedSlots})` : "Free"}
                </p>
                <p className="text-sm">
                  <Users className="inline h-4 w-4 mr-1" /> {totalPlayerSlots}/{match?.total_slots || 0} slots booked
                </p>
                <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
                  <p className="text-sm font-medium uppercase tracking-wide">Confirmation Code</p>
                  <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{ confirmationCode || 'N/A'}</p>
                </div>
                {selectedSlots > 1 && (
                  <p className="text-sm">
                    Slots Registered: {selectedSlots}
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
            <strong>Note:</strong> Save this code. You'll need it on match day.
          </p>
          <div className="flex justify-center w-full">
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs w-full sm:w-auto"
              onClick={handleDownload}
              disabled={!isImageLoaded || isDownloading}
              aria-label="Download confirmation card as image"
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

export default MatchJoinersDialog;
