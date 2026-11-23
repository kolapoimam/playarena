import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHeader, SPORT } from "@/components/sc/ui";
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
import { Seo } from "@/components/Seo";

const Guides = () => {
  const [activeTab, setActiveTab] = useState("organiser");
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Guides | Sport Cliq Nigeria"
        description="User guides for playing and organizing sports in Nigeria. Learn how to join football matches, cycling events, and more. Football in Nigeria, Sports in Nigeria, Sportstech."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <div className="min-h-screen flex flex-col bg-sc-bg text-sc-ink font-sans pb-32">
        <PageHeader title="Guides" subtitle="How to play, organise and host on SportCliq" back />

        <main className="flex-grow w-full px-5 pt-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate("/organize")}
            className="relative overflow-hidden rounded-[28px] p-5 h-[168px] flex flex-col justify-between text-left text-white"
            style={{ background: SPORT.guide.solid }}
          >
            <span className="self-start h-6 px-2.5 rounded-full bg-sc-ink text-white text-xs font-bold flex items-center">Get started</span>
            <span className="relative text-2xl leading-7 font-extrabold tracking-[-0.02em] max-w-[260px]">Organise your first match in a few taps</span>
            <ArrowRight aria-hidden="true" className="absolute right-5 bottom-5" size={24} />
          </button>
          <Card className="bg-transparent border-0 shadow-none rounded-none">
            <CardContent className="p-0">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 h-[46px] rounded-[15px] bg-sc-soft2 p-1 mb-4">
                  <TabsTrigger
                    value="organiser"
                    className="h-full rounded-xl text-sm font-bold text-sc-ink2 data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Organiser
                  </TabsTrigger>
                  <TabsTrigger
                    value="players"
                    className="h-full rounded-xl text-sm font-bold text-sc-ink2 data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Players
                  </TabsTrigger>
                  <TabsTrigger
                    value="venueOwner"
                    className="h-full rounded-xl text-sm font-bold text-sc-ink2 data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Venue Owner
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="organiser">
                  <Accordion type="single" collapsible className="w-full flex flex-col gap-2.5">
                    <AccordionItem
                      value="createMatch"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Creating a Match
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        To create a match, navigate to the "Organize Match" section,
                        enter the match title, date, time, venue, and pricing details.
                        Save to publish a public match or retrieve a password for a
                        private match. All types of football matches are supported
                        (5-a-side, 7-a-side, 11-a-side, etc.). You can choose to
                        include your contact number for direct communication with
                        players.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="organiserCode"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Match Management
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        When you create a match, you'll receive a Super Code. This code
                        is essential as it allows you to:
                        <ul className="list-disc ml-5 mt-2 space-y-1">
                          <li>Manage all aspects of your match</li>
                          <li>Confirm player registrations</li>
                          <li>Check-in players on match day</li>
                          <li>Request payouts for paid matches</li>
                          <li>Access player contact information during check-in</li>
                        </ul>
                        Keep this code secure and don't share it with players. You'll need
                        it every time you manage your match.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="privateMatch"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Creating a Private Match
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        For a private match, check the "Private Match" option during
                        creation, copy an access password, and share it with invited
                        players. Private matches won't appear in public search results,
                        giving you control over who joins your match.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="publicMatch"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Creating a Public Match
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Leave the "Private Match" option unchecked to create a public
                        match. It will be visible to all users for joining. Public matches
                        are ideal for finding new players or filling empty slots quickly.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="bulkSlots"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Enabling Bulk Slot Booking
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        As an organizer, you can enable the "Allow Bulk Booking" option
                        when creating a paid match. This lets players book multiple slots
                        at once, which is useful for players bringing friends. When bulk
                        booking is used, all slots will be checked in at once during the
                        match day.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="bulkPayment"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Bulk Payment on Paid Match
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        For paid matches, use the "Bulk Payment" feature to collect fees
                        from multiple players. Navigate to the match management page and
                        process payments securely. This is particularly useful for team
                        captains who want to pay for their entire team at once.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="manageMatches"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Managing Matches
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Access the "Manage Matches" section with your Super Code to edit
                        details, view players, and update statuses. The dashboard gives you
                        an overview of registered players, available slots, and payment
                        status. In compliance with NDPR, player phone numbers are hidden
                        by default but will be available during check-in for verification
                        purposes.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="confirmAttendance"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Confirming Attendance
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Confirm player attendance via the match management page using your
                        Super Code. Ask players for their individual codes during check-in
                        as proof of registration. You'll have access to player phone
                        numbers during check-in as an additional verification measure.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="cashout"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Cashout
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Request a cashout from earned match fees via the "Manage" section
                        using your Super Code. A 2% platform fee applies after your first
                        5 free matches. For player protection, cashouts can only be
                        requested starting 30 minutes before match time to ensure players
                        aren't scammed and matches actually take place as scheduled.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="contactInfo"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Contact Information
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        You can choose to display your phone number on match details. This
                        is optional but recommended for easier communication with players.
                        Player phone numbers are hidden by default (NDPR compliance) but
                        will be available to you during check-in for verification purposes.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                <TabsContent value="players">
                  <Accordion type="single" collapsible className="w-full flex flex-col gap-2.5">
                    <AccordionItem
                      value="joinMatch"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Joining a Match
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Search for a match, view details, and click "Join" if slots are
                        available. Enter a password for private matches if required. After
                        booking, you'll receive a unique code - save it immediately as
                        it's required for check-in on match day.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="playerCode"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Player Code Importance
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        When you book a match slot, you'll receive a unique player code.
                        This code is essential as it:
                        <ul className="list-disc ml-5 mt-2 space-y-1">
                          <li>Confirms your registration for the match</li>
                          <li>Is required for check-in on match day</li>
                          <li>Helps organizers verify your booking</li>
                          <li>Is needed for any refund requests</li>
                        </ul>
                        Take a screenshot or note of this code immediately after booking as
                        it won't be sent to you again.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="bulkBooking"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Booking Multiple Slots
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        If an organizer has enabled bulk booking for a paid match, you can
                        book multiple slots at once. This is useful when bringing friends.
                        All slots will be checked in together on match day using the same
                        code. Make sure all players arrive together for check-in.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="refund"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Refund Policy
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        • Cancel your participation 1 hour before match start for a full
                        refund
                        <br />
                        • Cancellations within 1 hour attract a 50% refund
                        <br />
                        • No refunds after the match starts for checked-in players
                        <br />
                        • You'll need your player code to request any refund
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="noShow"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        No Show Policy
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Full refund for no-shows if the player is unconfirmed, but
                        organizers may ban repeat offenders. Check in on time to avoid
                        issues. For bulk bookings, if any player in your group doesn't
                        show up, refunds are at the organizer's discretion.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="matchTypes"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Match Types
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        All types of football matches are supported, including 5-a-side,
                        7-a-side, 11-a-side, and other variations. Check the match
                        description for specific details about the format, skill level
                        requirements, and any special rules.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="privacy"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Privacy & Data Protection
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        In compliance with NDPR, your phone number is hidden from other
                        players by default. However, organizers will have access to your
                        contact information during check-in for verification purposes. This
                        is necessary to confirm identities and prevent fraudulent bookings.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                <TabsContent value="venueOwner">
                  <Accordion type="single" collapsible className="w-full flex flex-col gap-2.5">
                    <AccordionItem
                      value="createVenue"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Creating a Venue
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Register your venue by providing name, location, and availability
                        details in the "Add Venue" section. Include your phone number and
                        an accurate address with a Google Maps link to help players find
                        your venue easily.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="venueDetails"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Required Venue Information
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
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
                    <AccordionItem
                      value="bookVenue"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Booking a Venue
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Organizers can book your venue through the site. You'll be notified
                        and can confirm or decline. Providing quick responses to booking
                        requests increases your venue's attractiveness to organizers.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="referralFee"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Venue Referral Fee
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        A 10% referral fee is deducted from your earnings when your venue is
                        booked through the site, payable by you. This fee helps maintain the
                        platform and bring more organizers to your venue, increasing your
                        overall bookings.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="venueAccounts"
                      className="bg-white rounded-[22px] border-0 px-4"
                    >
                      <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">
                        Venue Accounts (Coming Soon)
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-[22px] text-sc-ink2">
                        Full profile and account features for venue owners are coming soon.
                        This will include a dashboard to track bookings, manage availability,
                        and view earnings reports. Stay tuned for updates on this feature.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>
              <MessageCircle size={22} />
            </span>
            <span className="flex-1 flex flex-col">
              <span className="text-[15px] font-extrabold">Need help?</span>
              <span className="text-[13px] text-sc-ink3">Reach out to us on X</span>
            </span>
            <a
              href="https://twitter.com/PiousGeek"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-bold flex items-center"
            >
              Contact us
            </a>
          </div>
        </main>

        <Navbar />
      </div>
    </>
  );
};

export default Guides;
