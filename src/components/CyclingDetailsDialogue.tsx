import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Download,
  ChevronDown,
  Bike, // Replace Bicycle with Bike
  MapPin,
  Calendar,
  DollarSignIcon,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  status: string;
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
    attendee_status: string;
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
  const [backgroundOption, setBackgroundOption] = useState<"cycle" | "white" | "green">("cycle");
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

  const shareEvent = async () => {
    const url = `${window.location.origin}/cycling/${event.slug}`;
    const shareText = `Join my cycling event: ${event.title} at ${event.start_landmark.name}, ${event.start_landmark.state} on ${formatDate(event.event_date)} at ${event.start_time}. ${attendees.length}/${event.max_attendees} spots taken. Powered by SportCliq. ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Cycling: ${event.title}`,
          text: shareText,
          url,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copied!",
          description: "Share it with your friends to join the event.",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const shareToWhatsApp = () => {
    const url = `${window.location.origin}/cycling/${event.slug}`;
    const shareText = `Join my cycling event: ${event.title} at ${event.start_landmark.name}, ${event.start_landmark.state} on ${formatDate(event.event_date)} at ${event.start_time}. ${attendees.length}/${event.max_attendees} spots. Powered by SportCliq. ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareToTwitter = () => {
    const url = `${window.location.origin}/cycling/${event.slug}`;
    const shareText = `Join my cycling event: ${event.title} at ${event.start_landmark.name}, ${event.start_landmark.state} on ${formatDate(event.event_date)} at ${event.start_time}. ${attendees.length}/${event.max_attendees} spots. Powered by SportCliq. ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/cycling/${event.slug}`;
    const shareText = `Join my cycling event: ${event.title} at ${event.start_landmark.name}, ${event.start_landmark.state} on ${formatDate(event.event_date)} at ${event.start_time}. ${attendees.length}/${event.max_attendees} spots taken. Powered by SportCliq.`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank");
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
      const logoSrc = backgroundOption === "white" ? "/playarenalight.png" : "/playarenadark.png";
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

      if (backgroundOption === "cycle") {
        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        bgImg.src = "/cycling-bg.jpg";
        await new Promise<void>((resolve) => {
          bgImg.onload = () => resolve();
          bgImg.onerror = () => {
            console.warn("Failed to load background");
            resolve();
          };
        });
      }

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
  }, [isImageLoaded, event, toast, backgroundOption]);

  return (
    <>
      <div className="flex gap-3 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Share2 className="mr-2 h-4 w-4" />
              Share
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={shareToWhatsApp}>
              Share to WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToTwitter}>
              Share to Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToFacebook}>
              Share to Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareEvent}>
              Share via Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setDownloadDialogOpen(true)}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </div>
      <Dialog
        open={downloadDialogOpen}
        onOpenChange={(open) => {
          setDownloadDialogOpen(open);
          setIsImageLoaded(false);
          if (!open) setBackgroundOption("cycle");
        }}
      >
        <DialogContent className="sm:max-w-[425px] rounded-lg">
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download or share this card to invite friends to your cycling event.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium">Background:</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="cycle"
                    checked={backgroundOption === "cycle"}
                    onChange={() => setBackgroundOption("cycle")}
                    disabled={isDownloading}
                  />
                  <span>Default</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="white"
                    checked={backgroundOption === "white"}
                    onChange={() => setBackgroundOption("white")}
                    disabled={isDownloading}
                  />
                  <span>White</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="green"
                    checked={backgroundOption === "green"}
                    onChange={() => setBackgroundOption("green")}
                    disabled={isDownloading}
                  />
                  <span>Green</span>
                </label>
              </div>
            </div>
            <div
              ref={cardRef}
              className={`rounded-lg p-6 shadow-lg ${
                backgroundOption === "cycle" ? "bg-cover bg-center" : ""
              }`}
              style={{
                backgroundImage:
                  backgroundOption === "cycle" ? "url(/cycling-bg.jpg)" : "",
                backgroundColor:
                  backgroundOption !== "cycle" ? backgroundOption : "transparent",
                ...(backgroundOption === "cycle" && {
                  backgroundBlendMode: "overlay",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                }),
              }}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <img
                    src={
                      backgroundOption === "white"
                        ? "/playarenalight.png"
                        : "/playarenadark.png"
                    }
                    alt="SportCliq Logo"
                    className="h-8 w-auto"
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
<Bike className={`h-6 w-6 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                </div>
                <h2
                  className={`text-xl font-bold ${
                    backgroundOption === "white" ? "text-black" : "text-white"
                  }`}
                >
                  {event.title}
                </h2>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center">
                    <MapPin
                      className={`h-4 w-4 mr-2 ${
                        backgroundOption === "white" ? "text-black" : "text-white"
                      }`}
                    />
                    <span
                      className={backgroundOption === "white" ? "text-black" : "text-white"}
                    >
                      {event.start_landmark.name}, {event.start_landmark.state}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar
                      className={`h-4 w-4 mr-2 ${
                        backgroundOption === "white" ? "text-black" : "text-white"
                      }`}
                    />
                    <span
                      className={backgroundOption === "white" ? "text-black" : "text-white"}
                    >
                      {formatDate(event.event_date)} at {event.start_time}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <DollarSignIcon
                      className={`h-4 w-4 mr-2 ${
                        backgroundOption === "white" ? "text-black" : "text-white"
                      }`}
                    />
                    <span
                      className={backgroundOption === "white" ? "text-black" : "text-white"}
                    >
                      {event.is_free
                        ? "Free"
                        : event.price
                        ? `₦${event.price.toLocaleString("en-NG")}`
                        : "Paid"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users
                      className={`h-4 w-4 mr-2 ${
                        backgroundOption === "white" ? "text-black" : "text-white"
                      }`}
                    />
                    <span
                      className={backgroundOption === "white" ? "text-black" : "text-white"}
                    >
                      {attendees.length}/{event.max_attendees} spots booked
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Share this card to invite friends to your event.
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={handleDownload}
                disabled={!isImageLoaded || isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
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
