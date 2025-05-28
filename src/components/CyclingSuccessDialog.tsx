import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Bike } from "lucide-react";
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
      img.src = "/playarenalight.png";
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
            className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <img
                src="/playarenalight.png"
                alt="SportCliq Logo"
                className="h-8 w-auto"
              />
              <Bike className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">{formValues.title || 'Untitled Event'}</h2>
            <div className="space-y-2 mb-4 text-sm leading-tight">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>
                  {selectedLandmark.name || 'Unknown Location'}, {selectedLandmark.state || 'Unknown State'}
                </span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{formValues.start_time || 'Unknown Time'}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>Hosted by {formValues.host_name || 'Unknown Host'}</span>
              </div>
            </div>
            <div className="bg-white text-green-500 rounded-md p-4 text-center shadow-inner">
              <p className="text-sm font-medium">
                {supercode ? "Supercode" : "Confirmation Code"}
              </p>
              <p className="text-3xl font-bold tracking-wider">{code}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
            <strong>Note:</strong> Save or download this code for check-in on event day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-md"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? "Downloading..." : "Download Card"}
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-md"
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
