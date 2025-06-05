import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Bike, Share2, Download } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

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

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({
        title: "Error",
        description: "Card element is not ready.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/playarenadark.png";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn("Failed to load logo image");
          resolve();
        };
      });

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/png")
      );

      if (!blob) throw new Error("Failed to convert canvas to Blob");

      const filename = `SportCliq-${supercode ? "Supercode" : "ConfirmationCode"}-${formValues.title.replace(/\s+/g, "-")}.png`;
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
            title: formValues.title,
            text: supercode
              ? `Host my cycling event with supercode ${supercode}!`
              : `Joined cycling event with confirmation code ${confirmationCode}!`,
          });
          URL.revokeObjectURL(url);
          return;
        } catch (shareError) {
          console.warn("Share API failed:", shareError);
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
      toast({
        title: "Sharing Not Supported",
        description: "Your browser does not support sharing. Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && !isDownloading) {
          onNavigate?.();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[375px] rounded-2xl">
        <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white">
          {supercode ? "Event Created Successfully!" : "Joined Event Successfully!"}
        </DialogTitle>
        <DialogDescription>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            {supercode
              ? "Your cycling event has been created. Below is your unique 6-digit supercode for check-ins."
              : "You have joined the cycling event. Below is your 6-digit confirmation code for check-in."}
          </p>
          <div
            ref={cardRef}
            className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl max-w-md mx-auto overflow-hidden border-4 border-dashed border-white/30"
            style={{
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
              backgroundSize: '40px 40px',
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)',
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
              <img src="/playarenadark.png" alt="SportCliq Logo" className="h-10 w-auto" />
              <Bike className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight font-condensed uppercase text-center">{formValues.title || 'Untitled Event'}</h2>
            <div className="text-center mb-4">
              <p className="text-sm"><MapPin className="inline h-4 w-4 mr-1" /> {selectedLandmark.name || 'Unknown Location'}, {selectedLandmark.state || 'Unknown State'}</p>
              <p className="text-sm"><CalendarIcon className="inline h-4 w-4 mr-1" /> {formattedDate}</p>
              <p className="text-sm"><Clock className="inline h-4 w-4 mr-1" /> {formValues.start_time || 'Unknown Time'}</p>
              <p className="text-sm font-semibold"><User className="inline h-4 w-4 mr-1" /> Hosted by {formValues.host_name || 'Unknown Host'}</p>
            </div>
            <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
              <p className="text-sm font-medium uppercase tracking-wide">{supercode ? "Supercode" : "Confirmation Code"}</p>
              <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{code}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center">
            <strong>Note:</strong> Save or download this code for check-in on event day.
          </p>
          <div className="flex justify-center gap-4 px-6 py-4">
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200 border-0 max-w-xs"
              onClick={handleDownload}
              disabled={isDownloading}
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
  );
};

export default CyclingSuccessDialog;
