import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronUp, Repeat } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { useNavigate } from "react-router-dom";

type Booking = { 
  id: string; 
  venue_id: string;
  match_id: string | null;
  title: string; 
  slug: string | null;
  match_date: string; 
  start_time: string; 
  end_time: string; 
  organizer_name: string;
  organizer_id: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

type Organizer = {
  id: string;
  is_verified: boolean;
};

interface ManagerBookingViewProps {
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  organizers: Organizer[];
  isBookingsOpen: boolean;
  setIsBookingsOpen: (open: boolean) => void;
  userId: string | null; // Added to check authentication
}

const ManagerBookingView = ({
  upcomingBookings,
  pastBookings,
  organizers,
  isBookingsOpen,
  setIsBookingsOpen,
  userId,
}: ManagerBookingViewProps) => {
  const navigate = useNavigate();

  return (
    <Collapsible open={isBookingsOpen} onOpenChange={setIsBookingsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center text-lg font-semibold text-sc-ink dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2"
        >
          <span>Bookings</span>
          {isBookingsOpen ? (
            <ChevronUp className="w-5 h-5 text-sc-ink3 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-sc-ink3 dark:text-gray-400" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-4">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-sc-soft dark:bg-gray-700 rounded-t-lg sticky top-[64px] z-10">
              <TabsTrigger
                value="upcoming"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Past
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => {
                    const organizer = organizers.find(org => org.id === booking.organizer_id);
                    const isVerified = organizer?.is_verified || false;
                    return (
                      <div
                        key={booking.id}
                        className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700 w-full"
                      >
                        <h3 className="font-medium text-sc-ink dark:text-gray-100">{booking.title}</h3>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                          {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Duration: {differenceInHours(
                            new Date(`${booking.match_date}T${booking.end_time}`),
                            new Date(`${booking.match_date}T${booking.start_time}`)
                          )} hours
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                          Organizer: {booking.organizer_name}
                          {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                        </p>
                        {userId && booking.is_recurring && (
                          <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                            <Repeat className="w-4 h-4 mr-1" />
                            Repeats {booking.recurring_frequency} for {booking.recurring_occurrences} times
                          </p>
                        )}
                        <div className="mt-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                  onClick={() => booking.slug && navigate(`/match/${booking.slug}`)}
                                  disabled={!booking.slug}
                                >
                                  View Details
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!booking.slug && (
                              <TooltipContent>
                                No match details available
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                  No upcoming bookings found.
                </p>
              )}
            </TabsContent>
            <TabsContent value="past">
              {pastBookings.length > 0 ? (
                <div className="space-y-4">
                  {pastBookings.map((booking) => {
                    const organizer = organizers.find(org => org.id === booking.organizer_id);
                    const isVerified = organizer?.is_verified || false;
                    return (
                      <div
                        key={booking.id}
                        className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700 w-full"
                      >
                        <h3 className="font-medium text-sc-ink dark:text-gray-100">{booking.title}</h3>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Date: {format(new Date(booking.match_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Time: {format(new Date(`${booking.match_date}T${booking.start_time}`), "h:mm a")} -{" "}
                          {format(new Date(`${booking.match_date}T${booking.end_time}`), "h:mm a")}
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">
                          Duration: {differenceInHours(
                            new Date(`${booking.match_date}T${booking.end_time}`),
                            new Date(`${booking.match_date}T${booking.start_time}`)
                          )} hours
                        </p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                          Organizer: {booking.organizer_name}
                          {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                        </p>
                        {userId && booking.is_recurring && (
                          <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                            <Repeat className="w-4 h-4 mr-1" />
                            Repeats {booking.recurring_frequency} for {booking.recurring_occurrences} times
                          </p>
                        )}
                        <div className="mt-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                  onClick={() => booking.slug && navigate(`/match/${booking.slug}`)}
                                  disabled={!booking.slug}
                                >
                                  View Details
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!booking.slug && (
                              <TooltipContent>
                                No match details available
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                  No past bookings found.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ManagerBookingView;
