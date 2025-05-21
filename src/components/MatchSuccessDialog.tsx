import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Trophy } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

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
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({
        title: "Error",
        description: "Card element is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `SportCliq-Supercode-${formValues.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
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

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && matchSlug) {
        onNavigate(matchSlug);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[375px] rounded-2xl">
        <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Match Created Successfully!</DialogTitle>
        <DialogDescription>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Your match has been created. Below is your unique 6-digit supercode for check-ins on match day.
            {formValues.is_private && " Also, note the access password to share with invited players."}
          </p>
          <div 
            ref={cardRef}
            className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <img 
                src="/playarenadark.png" 
                alt="PlayArena Logo" 
                className="h-8 w-auto"
              />
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">{formValues.title || "Your Match"}</h2>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{selectedVenue?.name || "Venue"}</span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>{formValues.match_date ? format(formValues.match_date, "PPP") : "Date"}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>From {formValues.start_time || "Start"} to {formValues.end_time || "End"}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>Organized by {formValues.organizer_name || "Organizer"}</span>
              </div>
              {formValues.is_private && (
                <div className="flex items-center">
                  <span className="font-semibold">Access Password: </span>
                  <span className="ml-2 font-mono">{formValues.access_password || "N/A"}</span>
                </div>
              )}
            </div>
            <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
              <p className="text-sm font-medium">Supercode</p>
              <p className="text-3xl font-bold tracking-wider">{supercode || "N/A"}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
            <strong>Note:</strong> Save or download this code. You'll need it to confirm and check in players on match day.
            {formValues.is_private && " Share the access password with invited players to allow them to join."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? "Downloading..." : "Download Supercode"}
            </Button>
            <Button 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={() => {
                if (!isDownloading && matchSlug) {
                  onOpenChange(false);
                  onNavigate(matchSlug);
                }
              }}
              disabled={isDownloading}
            >
              Go to Match Details
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default MatchSuccessDialog;
