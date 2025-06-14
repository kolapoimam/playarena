import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Trophy, Download, Volleyball, Medal, Repeat } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { FormValues } from "@/components/MatchFormTypes";

type Venue = {
  id: string;
  name: string;
  city?: string;
};

type MatchPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: FormValues;
  selectedVenue: Venue | undefined;
};

const MatchPreviewDialog = ({ open, onOpenChange, formValues, selectedVenue }: MatchPreviewDialogProps) => {
  const { toast } = useToast();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green
  const cardRef = useRef<HTMLDivElement>(null);

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

      const filename = `SportCliq-MatchPreview-${formValues.title.replace(/\s+/g, '-')}.png`;
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
        description: "Failed to download match preview card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-[500px] rounded-2xl p-4 sm:p-6">
        <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white text-center">Match Preview</DialogTitle>
        <DialogDescription className="flex flex-col items-center">
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
              <div className="space-y-2 mb-4 text-sm text-center">
                <div className="flex items-center justify-center">
                  <MapPin className="h-4 w-4 mr-1 text-white" />
                  <span className="text-white">{selectedVenue ? `${selectedVenue.name}${selectedVenue.city ? `, ${selectedVenue.city}` : ''}` : "Venue not loaded"}</span>
                </div>
                <div className="flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 mr-1 text-white" />
                  <span className="text-white">{formValues.match_date ? format(formValues.match_date, "PPP") : "Date"}</span>
                </div>
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4 mr-1 text-white" />
                  <span className="text-white">From {formValues.start_time || "Start"} to {formValues.end_time || "End"}</span>
                </div>
                <div className="flex items-center justify-center">
                  <User className="h-4 w-4 mr-1 text-white" />
                  <span className="text-white">Organized by {formValues.organizer_name || "Organizer"}</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="font-semibold text-white">Players: </span>
                  <span className="ml-1 text-white">{formValues.total_slots || "N/A"}</span>
                </div>
                {formValues.is_paid && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Price: </span>
                    <span className="ml-1 text-white">₦{formValues.price?.toFixed(2) || "0.00"}</span>
                  </div>
                )}
                {formValues.sell_tickets && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Ticket Price: </span>
                    <span className="ml-1 text-white">₦{formValues.ticket_price?.toFixed(2) || "N/A"}</span>
                  </div>
                )}
                {formValues.max_tickets && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Max Tickets: </span>
                    <span className="ml-1 text-white">{formValues.max_tickets}</span>
                  </div>
                )}
                {formValues.notes && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Notes: </span>
                    <span className="ml-1 text-white">{formValues.notes}</span>
                  </div>
                )}
                {formValues.skill_level && formValues.skill_level !== "" && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Skill Level: </span>
                    <span className="ml-1 text-white">{formValues.skill_level}</span>
                  </div>
                )}
                {formValues.match_type && formValues.match_type !== "" && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Match Type: </span>
                    <span className="ml-1 text-white">{formValues.match_type}</span>
                  </div>
                )}
                {formValues.gender && formValues.gender !== "" && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Gender: </span>
                    <span className="ml-1 text-white">{formValues.gender}</span>
                  </div>
                )}
                {formValues.is_private && (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-white">Access Password: </span>
                    <span className="ml-1 font-mono text-white">{formValues.access_password || "N/A"}</span>
                  </div>
                )}
                {formValues.is_recurring && (
                  <div className="flex items-center justify-center">
                    <Repeat className="h-4 w-4 mr-1 text-white" />
                    <span className="text-white">
                      Repeats {formValues.recurring_frequency} for {formValues.recurring_occurrences} times
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center max-w-xs">
            <strong>Note:</strong> Review your match details and download the preview if needed.
          </p>
          <div className="flex justify-center mt-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default MatchPreviewDialog;
