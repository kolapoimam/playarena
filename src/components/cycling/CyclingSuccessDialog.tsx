import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Share2, Download } from "lucide-react";
import TicketCard, { downloadElementAsPng } from "@/components/sc/TicketCard";
import { format } from "date-fns";
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
    const shareText = `Ride with us: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. Join the crew on SportCliq ${eventSlug ? `https://app.sportcliq.com/cycling/${eventSlug}` : 'https://app.sportcliq.com'}`;
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
    const shareText = `Ride with us: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. Join the crew on SportCliq ${eventSlug ? `https://app.sportcliq.com/cycling/${eventSlug}` : 'https://app.sportcliq.com'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Ride with us: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. Join the crew on SportCliq ${eventSlug ? `https://app.sportcliq.com/cycling/${eventSlug}` : 'https://app.sportcliq.com'}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/cycling/${eventSlug}`;
    const shareText = `Ride with us: ${formValues.title} at ${selectedLandmark.name || 'unknown location'}, ${selectedLandmark.state || 'unknown state'} on ${formattedDate} at ${formValues.start_time}. Join the crew on SportCliq ${eventSlug ? `https://app.sportcliq.com/cycling/${eventSlug}` : 'https://app.sportcliq.com'}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
  };

  const handleDownload = async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({ title: "One moment", description: "Your ticket is still loading. Try again in a second." });
      return;
    }
    setIsDownloading(true);
    try {
      await downloadElementAsPng(cardRef.current, `SportCliq-${supercode ? "Ride-Host" : "Ride-Ticket"}-${formValues.title}-${code}.png`);
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Error", description: "Failed to download your ticket.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

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
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] max-h-[92vh] overflow-y-auto bg-sc-bg p-5">
        <div className="flex flex-col items-center gap-2 text-center pt-2">
          <span className="w-14 h-14 rounded-full text-white flex items-center justify-center" style={{ background: "#FB923C" }}>
            <Check size={28} strokeWidth={3} />
          </span>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.02em] text-sc-ink">{supercode ? "Your ride is live" : "You're riding!"}</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 max-w-[290px]">
            {supercode
              ? "Keep this supercode private. You'll use it to manage riders and check them in."
              : "Show this QR code or the code below to the host when you arrive."}
          </DialogDescription>
        </div>
        <TicketCard
          ref={cardRef}
          sport="cycling"
          kind={supercode ? "Host pass" : "Ride ticket"}
          title={formValues.title || "Your ride"}
          rows={[
            { label: "Date", value: formattedDate },
            { label: "Starts", value: formValues.start_time || "TBC" },
            { label: "Meet at", value: `${selectedLandmark.name || "Start point"}${selectedLandmark.state ? `, ${selectedLandmark.state}` : ""}` },
            { label: "Host", value: formValues.host_name || "SportCliq host" },
          ]}
          code={code}
          codeLabel={supercode ? "Supercode" : "Confirmation code"}
          qr={!supercode}
          footnote={supercode ? "Do not share this code with riders." : "The host scans this QR code on ride day."}
          onReady={() => setIsImageLoaded(true)}
        />
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!isImageLoaded || isDownloading}
            className="h-[52px] rounded-full text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "#FB923C" }}
          >
            <Download size={18} /> {isDownloading ? "Saving..." : "Save ticket as image"}
          </button>
          {!supercode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="h-[46px] rounded-full bg-white border border-sc-line text-sc-ink font-bold flex items-center justify-center gap-2">
                  <Share2 size={16} /> Share ride
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[220px]">
                <DropdownMenuItem onClick={shareToWhatsApp}>Share to WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={shareToTwitter}>Share to X</DropdownMenuItem>
                <DropdownMenuItem onClick={shareToFacebook}>Share to Facebook</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CyclingSuccessDialog;
