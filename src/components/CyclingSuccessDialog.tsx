import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Bicycle } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

type FormValues = {
  title: string;
  event_date: Date | null;
  start_time: string;
  host_name: string;
};

type Landmark = {
  id: string;
  name: string;
  state: string;
};

type CyclingSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: FormValues;
  selectedLandmark: Landmark | undefined;
  supercode?: string | null;
  confirmationCode?: string | null;
  eventSlug: string;
  onNavigate: () => void;
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

      const filename = `SportCliq-${
        supercode ? "Supercode" : "ConfirmationCode"
      }-${formValues.title.replace(/\s+/g, "-")}.png`;
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

  const code = supercode || confirmationCode;
  if (!code) {
    toast({
      title: "Error",
      description: "No supercode or confirmation code provided.",
      variant: "destructive",
    });
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onNavigate();
        }
        onOpenChange(open);
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
              <Bicycle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {formValues.title || "Cycling Event"}
            </h2>
            <div className="space-y-2 mb-4 text-sm leading-tight">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>
                  {selectedLandmark?.name || "Landmark"},{" "}
                  {selectedLandmark?.state || ""}
                </span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>
                  {formValues.event_date
                    ? format(formValues.event_date, "PPP")
                    : "Date"}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{formValues.start_time || "Start Time"}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>Hosted by {formValues.host_name || "Host"}</span>
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
            <strong>Note:</strong> Save or download this code for check-in on event
            day.
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
                  onNavigate();
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
