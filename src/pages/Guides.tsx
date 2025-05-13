import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Guides = () => {
  const [activeTab, setActiveTab] = useState("organiser");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Guides</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

        <Card className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900 dark:text-gray-100">
              User Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-6">
                <TabsTrigger
                  value="organiser"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Organiser
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Players
                </TabsTrigger>
                <TabsTrigger
                  value="venueOwner"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Venue Owner
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organiser">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      To create a match, navigate to the "Organize Match" section, enter the match title, date, time, venue, and pricing details. Save to publish a public match or retrieve a password for a private match. All types of football matches are supported (5-a-side, 7-a-side, 11-a-side, etc.). You can choose to include your contact number for direct communication with players.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="organiserCode" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Match Management
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      When you create a match, you'll receive a Super Code. This code is essential as it allows you to:
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Manage all aspects of your match</li>
                        <li>Confirm player registrations</li>
                        <li>Check-in players on match day</li>
                        <li>Request payouts for paid matches</li>
                        <li>Access player contact information during check-in</li>
                      </ul>
                      Keep this code secure and don't share it with players. You'll need it every time you manage your match.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privateMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Private Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      For a private match, check the "Private Match" option during creation, copy an access password, and share it with invited players. Private matches won't appear in public search results, giving you control over who joins your match.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="publicMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Public Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Leave the "Private Match" option unchecked to create a public match. It will be visible to all users for joining. Public matches are ideal for finding new players or filling empty slots quickly.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bulkSlots" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Enabling Bulk Slot Booking
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      As an organizer, you can enable the "Allow Bulk Booking" option when creating a paid match. This lets players book multiple slots at once, which is useful for players bringing friends. When bulk booking is used, all slots will be checked in at once during the match day.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bulkPayment" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Bulk Payment on Paid Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      For paid matches, use the "Bulk Payment" feature to collect fees from multiple players. Navigate to the match management page and process payments securely. This is particularly useful for team captains who want to pay for their entire team at once.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="manageMatches" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Managing Matches
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Access the "Manage Matches" section with your Super Code to edit details, view players, and update statuses. The dashboard gives you an overview of registered players, available slots, and payment status. In compliance with GDPR, player phone numbers are hidden by default but will be available during check-in for verification purposes.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="confirmAttendance" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Confirming Attendance
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Confirm player attendance via the match management page using your Super Code. Ask players for their individual codes during check-in as proof of registration. You'll have access to player phone numbers during check-in as an additional verification measure.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cashout" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Cashout
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Request a cashout from earned match fees via the "Manage" section using your Super Code. A 2% platform fee applies after your first 5 free matches. For player protection, cashouts can only be requested starting 30 minutes before match time to ensure players aren't scammed and matches actually take place as scheduled.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="contactInfo" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Contact Information
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      You can choose to display your phone number on match details. This is optional but recommended for easier communication with players. Player phone numbers are hidden by default (GDPR compliance) but will be available to you during check-in for verification purposes.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="players">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="joinMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Joining a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Search for a match, view details, and click "Join" if slots are available. Enter a password for private matches if required. After booking, you'll receive a unique code - save it immediately as it's required for check-in on match day.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="playerCode" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Player Code Importance
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      When you book a match slot, you'll receive a unique player code. This code is essential as it:
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Confirms your registration for the match</li>
                        <li>Is required for check-in on match day</li>
                        <li>Helps organizers verify your booking</li>
                        <li>Is needed for any refund requests</li>
                      </ul>
                      Take a screenshot or note of this code immediately after booking as it won't be sent to you again.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bulkBooking" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Booking Multiple Slots
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      If an organizer has enabled bulk booking for a paid match, you can book multiple slots at once. This is useful when bringing friends. All slots will be checked in together on match day using the same code. Make sure all players arrive together for check-in.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="refund" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Refund Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      • Cancel your participation 1 hour before match start for a full refund
                      • Cancellations within 1 hour attract a 50% refund
                      • No refunds after the match starts for checked-in players
                      • You'll need your player code to request any refund
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="noShow" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      No Show Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Full refund for no-shows if the player is unconfirmed, but organizers may ban repeat offenders. Check in on time to avoid issues. For bulk bookings, if any player in your group doesn't show up, refunds are at the organizer's discretion.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="matchTypes" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Match Types
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      All types of football matches are supported, including 5-a-side, 7-a-side, 11-a-side, and other variations. Check the match description for specific details about the format, skill level requirements, and any special rules.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privacy" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Privacy & Data Protection
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      In compliance with GDPR, your phone number is hidden from other players by default. However, organizers will have access to your contact information during check-in for verification purposes. This is necessary to confirm identities and prevent fraudulent bookings.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="venueOwner">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createVenue" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Register your venue by providing name, location, and availability details in the "Add Venue" section. Include your phone number and an accurate address with a Google Maps link to help players find your venue easily.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="venueDetails" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Required Venue Information
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      When registering your venue, please include:
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Venue name and type (indoor/outdoor)</li>
                        <li>Complete address with postal code</li>
                        <li>Google Maps link for easy navigation</li>
                        <li>Contact phone number</li>
                        <li>Available hours and days</li>
                        <li>Pricing structure and any special conditions</li>
                        <li>Facilities available (changing rooms, showers, etc.)</li>
                      </ul>
                      Accurate and complete information increases your venue's booking rate.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bookVenue" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Booking a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Organizers can book your venue through the site. You'll be notified and can confirm or decline. Providing quick responses to booking requests increases your venue's attractiveness to organizers.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="referralFee" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Venue Referral Fee
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      A 10% referral fee is deducted from your earnings when your venue is booked through the site, payable by you. This fee helps maintain the platform and bring more organizers to your venue, increasing your overall bookings.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="venueAccounts" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Venue Accounts (Coming Soon)
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Full profile and account features for venue owners are coming soon. This will include a dashboard to track bookings, manage availability, and view earnings reports. Stay tuned for updates on this feature.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Need help? Reach out to us on Twitter!
            </p>
            <Button
              asChild
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors"
            >
              <a href="https://twitter.com/PiousGeek" target="_blank" rel="noopener noreferrer">
                Contact Us
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              User accounts and profiles coming soon! Stay tuned for enhanced features for players, organizers, and venue owners.
            </p>
          </CardContent>
        </Card>

        <Navbar />
      </div>
  );
};

export default Guides;
