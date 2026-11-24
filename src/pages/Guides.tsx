import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHeader, SPORT, Segmented } from "@/components/sc/ui";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { FEES } from "@/lib/fees";

type Tab = "organise" | "join" | "venues" | "fees";
const pct = (n: number) => `${Math.round(n * 100)}%`;

// One guide for every kind of activity. Matches and rides work the same way,
// so the copy talks about activities and names the differences where they matter.
const GUIDES: Record<Tab, { q: string; a: string }[]> = {
  organise: [
    { q: "What can I organise?", a: "Football matches and group rides today, with more sports on the way. Everything here works the same for each activity unless we say otherwise." },
    { q: "Do I need an account?", a: "Yes. You need to sign in to organise a match, host a ride or book a venue. It keeps your activities, payments and cashouts tied to you." },
    { q: "Setting up a match", a: "Tap Organise, pick the venue, date and time, choose how many players and whether it is free or paid, then publish. If a venue gave you a booking code, the venue, date and time fill in for you and stay locked." },
    { q: "Hosting a ride", a: "Tap Host a ride, pick a start landmark and an optional finish, set the date, time, route length and spots, then publish. Use Preview to see the card riders will share." },
    { q: "Public or private", a: "Public activities show in search for everyone. Private ones are hidden and players need the access code you share to see and join." },
    { q: "Your Super Code", a: "Each activity you create gets a Super Code. Keep it safe. It lets you manage players or riders, check people in, edit details and request cashouts, even from another phone." },
    { q: "Checking people in", a: "On the day, open Manage, enter your Super Code and check in each player or rider with their personal code. Only people who are checked in count towards your earnings." },
    { q: "Repeating activities", a: "Matches can repeat daily, weekly or monthly for a set number of sessions. A repeating booking code from a venue sets this up for you." },
    { q: "Cashing out", a: `Request a cashout from Manage once paid players or riders have been checked in. Cashouts open from 30 minutes before start time so players are protected. Your first ${FEES.activityFreeCount} paid activities have no fee. After that ${pct(FEES.activityRate)} is kept as the platform fee, and the cashout screen shows the exact amount you will receive.` },
    { q: "Notifications", a: "In Profile, open Notifications to choose alerts for new players or riders, full activities and reminders. Each one can go by push, email or both." },
  ],
  join: [
    { q: "Joining a match or ride", a: "Find an activity in Search or from a shared link, tap Join, add your details and pay if it is paid. You do not need an account to join." },
    { q: "Your personal code", a: "After joining you get a personal code. Show it to the organiser or host when you arrive so they can check you in." },
    { q: "Booking for friends", a: "You can take more than one slot or spot in one go and pay once. Each person still gets checked in on the day." },
    { q: "Private activities", a: "If an activity is private, ask the organiser for its access code. Enter it when asked and the activity opens." },
    { q: "Cancelling and refunds", a: "You can cancel a spot from My matches or My cycling any time before the start. Cancel 12 hours or more ahead and you get a full refund. Cancel later than that and you get 50% back. If the organiser cancels, everyone gets a full refund." },
    { q: "Joining a live activity", a: "Running late or just heard about it? You can still join a match or ride while it is live, right up until it ends." },
    { q: "No shows", a: "Please turn up or let the organiser know. Organisers can see who did not check in." },
    { q: "Favourites and alerts", a: "Tap the heart on a venue or a landmark to save it. We will tell you when new matches or rides are set up there." },
    { q: "Your privacy", a: "Your phone number and email are only shared with the organiser or host of an activity you join." },
  ],
  venues: [
    { q: "Listing your venue", a: "Go to Profile, then My venues, and tap List a new venue. Add photos, address, opening hours and price per hour." },
    { q: "Linking your venue", a: "Enter the 6 character access code SportCliq gave you in My venues. One account manages each venue." },
    { q: "Bookings and your calendar", a: "Players and organisers book open times on your venue page. Every booking shows on the Calendar tab of your venue manager." },
    { q: "Booking codes", a: "Took a booking offline? Create a booking code to hold that time. It blocks the slot on your calendar and the organiser uses the code to set up their match. Codes can repeat daily, weekly on chosen days, or monthly on a chosen date. You can cancel an unused code or stop a repeating one at any time." },
    { q: "Pausing bookings", a: "Switch your venue to Inactive on the Calendar tab to pause new bookings. Organisers who pick your venue are told to confirm with you first." },
    { q: "Payouts", a: `Your first paid booking has no fee. After that a ${pct(FEES.venueRate)} referral fee applies to each paid booking. The Payouts tab shows what you collected, the fee and what you can cash out.` },
  ],
  fees: [
    { q: "Organisers and hosts", a: `Your first ${FEES.activityFreeCount} paid activities are free. After that a ${pct(FEES.activityRate)} platform fee applies to every paid activity, whatever the sport.` },
    { q: "Venues", a: `Your first paid booking is free. After that a ${pct(FEES.venueRate)} referral fee applies to each paid booking made through SportCliq.` },
    { q: "Players and riders", a: "Joining is free. You only pay the price the organiser sets for a paid activity." },
    { q: "Free activities", a: "No fees at all. Free matches and rides cost nothing to set up or join." },
  ],
};

const Guides = () => {
  const [tab, setTab] = useState<Tab>("organise");
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Guides | Sport Cliq Nigeria"
        description="How to join and organise football matches, group rides and venue bookings in Nigeria with SportCliq."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <div className="min-h-screen flex flex-col bg-sc-bg text-sc-ink font-sans pb-32">
        <PageHeader title="Guides" subtitle="How to play, organise, host and manage venues" back />

        <main className="flex-grow w-full px-5 pt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => navigate("/organize")} className="relative overflow-hidden rounded-[24px] p-4 h-[132px] flex flex-col justify-between text-left text-white" style={{ background: SPORT.football.solid }}>
              <span className="text-xs font-bold opacity-80">Football</span>
              <span className="text-[18px] leading-6 font-extrabold tracking-[-0.02em]">Organise a match</span>
              <ArrowRight aria-hidden="true" className="absolute right-4 bottom-4" size={20} />
            </button>
            <button type="button" onClick={() => navigate("/host-cycling")} className="relative overflow-hidden rounded-[24px] p-4 h-[132px] flex flex-col justify-between text-left text-white" style={{ background: SPORT.cycling.solid }}>
              <span className="text-xs font-bold opacity-80">Cycling</span>
              <span className="text-[18px] leading-6 font-extrabold tracking-[-0.02em]">Host a ride</span>
              <ArrowRight aria-hidden="true" className="absolute right-4 bottom-4" size={20} />
            </button>
          </div>

          <Segmented
            options={[{ value: "organise", label: "Organise" }, { value: "join", label: "Join" }, { value: "venues", label: "Venues" }, { value: "fees", label: "Fees" }]}
            value={tab}
            onChange={(v) => setTab(v as Tab)}
          />

          <Accordion key={tab} type="single" collapsible className="w-full flex flex-col gap-2.5">
            {GUIDES[tab].map((g, i) => (
              <AccordionItem key={g.q} value={`${tab}-${i}`} className="bg-white rounded-[22px] border-0 px-4">
                <AccordionTrigger className="text-[15px] font-extrabold text-left py-4 hover:no-underline">{g.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-[22px] text-sc-ink2">{g.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: SPORT.football.bg, color: SPORT.football.fg }}>
              <MessageCircle size={22} />
            </span>
            <span className="flex-1 flex flex-col">
              <span className="text-[15px] font-extrabold">Need help?</span>
              <span className="text-[13px] text-sc-ink3">Reach out to us on X</span>
            </span>
            <a href="https://x.com/SportCliq" target="_blank" rel="noopener noreferrer" className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-bold flex items-center">
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
