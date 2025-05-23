import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import { ArrowRight, Calendar, MapPin, Users, ChevronDown, ChevronUp, Trophy, Play, Shield, Star, Twitter, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import ThemeToggle from "@/components/ThemeToggle";

// Sample data for matches (simplified from Index.tsx)
type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
};

// Sample data for venues (simplified from Index.tsx)
type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  match_count: number;
  image_urls: string[] | null;
};

const Home = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isFAQOpen, setIsFAQOpen] = useState(true);
  const [activeFaqTab, setActiveFaqTab] = useState("general");

  // Sample data for matches and venues (static for demo purposes)
  const upcomingMatches: Match[] = [
    {
      id: "1",
      slug: "match-1",
      title: "Weekend Kickoff Match",
      match_date: "2025-05-24",
      match_time: "15:00",
      is_paid: false,
      price: null,
      venue: { slug: "venue-1", name: "Green Field Arena", city: "Lagos" },
    },
    {
      id: "2",
      slug: "match-2",
      title: "Evening Showdown",
      match_date: "2025-05-25",
      match_time: "18:00",
      is_paid: true,
      price: 500,
      venue: { slug: "venue-2", name: "City Park Stadium", city: "Abuja" },
    },
  ];

  const popularVenues: Venue[] = [
    {
      id: "1",
      slug: "venue-1",
      name: "Green Field Arena",
      city: "Lagos",
      match_count: 12,
      image_urls: ["https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg"],
    },
    {
      id: "2",
      slug: "venue-2",
      name: "City Park Stadium",
      city: "Abuja",
      match_count: 8,
      image_urls: ["https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg"],
    },
  ];

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Simulate joining waitlist (replace with actual logic)
      alert(`Thank you for joining the waitlist, ${email}!`);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-nunito">
      {/* Header Section */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-600 to-green-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/navlogo.png" alt="Sport Cliq Logo" className="h-10 w-10 object-contain mr-3" />
            <h1 className="text-2xl font-bold">Sport Cliq</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navigate("/login")}
              className="bg-white text-green-600 hover:bg-gray-100 font-semibold px-4 py-2 rounded-full transition-all"
            >
              Login
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-green-50 to-white dark:from-green-900 dark:to-gray-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Kick Off Your Game with <span className="text-green-600">Sport Cliq</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Organize, join, and manage football matches effortlessly across Nigeria. Your game, your rules!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center space-x-4"
          >
            <Button
              onClick={() => navigate("/organize")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full flex items-center transition-all"
            >
              Organize a Match <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button
              onClick={() => navigate("/matches")}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold px-6 py-3 rounded-full transition-all"
            >
              Find a Match
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Sport Cliq?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <Play className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Organize Matches</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create public or private matches with ease, set pricing, and manage players using a unique Super Code.
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Discover Venues</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Find and book top venues for your matches, complete with detailed info and availability.
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Join the Community</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect with players, join matches, and track your performance stats in one place.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Upcoming Matches Section */}
      <section className="py-16 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Upcoming Matches</h2>
            <Button
              onClick={() => navigate("/matches")}
              variant="outline"
              className="text-green-600 hover:bg-green-600 hover:text-white transition-colors"
            >
              See All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map((match) => (
              <motion.div
                key={match.id}
                whileHover={{ scale: 1.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">{match.title}</h3>
                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{formatDate(match.match_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span>{match.venue?.name}, {match.venue?.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {match.is_paid ? `₦${match.price?.toFixed(2)}` : "Free"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/match/${match.slug}`)}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium transition-colors"
                >
                  Join Match
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Venues Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Popular Venues</h2>
            <Button
              onClick={() => navigate("/venues")}
              variant="outline"
              className="text-green-600 hover:bg-green-600 hover:text-white transition-colors"
            >
              See All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularVenues.map((venue) => (
              <motion.div
                key={venue.id}
                whileHover={{ scale: 1.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => navigate(`/venue/${venue.slug}`)}
              >
                <img
                  src={venue.image_urls?.[0] || "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg"}
                  alt={venue.name}
                  className="w-full h-48 object-cover rounded-t-xl"
                />
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{venue.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{venue.city}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guides Section */}
      <section className="py-16 bg-gradient-to-b from-green-50 to-white dark:from-green-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Get Started with Sport Cliq
          </h2>
          <Tabs defaultValue="organiser" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-8">
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
              <Accordion type="single" collapsible className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <AccordionItem value="createMatch">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Creating a Match
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    Navigate to "Organize Match", enter details like title, date, time, venue, and pricing. Publish as public or private with a password.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="manageMatches">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Managing Matches
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    Use your Super Code to edit details, view players, confirm attendance, and request payouts for paid matches.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="players">
              <Accordion type="single" collapsible className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <AccordionItem value="joinMatch">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Joining a Match
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    Search for matches, click "Join", and save your unique player code for check-in on match day.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="refund">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Refund Policy
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    Cancel 1 hour before for a full refund; within 1 hour, get 50%. No refunds after match start for checked-in players.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="venueOwner">
              <Accordion type="single" collapsible className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <AccordionItem value="createVenue">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Creating a Venue
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    Add your venue with details like name, location, availability, and pricing to attract organizers.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="referralFee">
                  <AccordionTrigger className="text-lg font-medium hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2">
                    Venue Referral Fee
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 px-2 py-2">
                    A 10% referral fee is deducted from bookings to maintain the platform and increase your visibility.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <Button
              variant="ghost"
              onClick={() => setIsFAQOpen(!isFAQOpen)}
              className="text-green-600 hover:text-green-700"
            >
              {isFAQOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </Button>
          </div>
          <AnimatePresence>
            {isFAQOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex justify-center space-x-4 mb-6">
                  <Button
                    className={`px-4 py-2 rounded-md ${activeFaqTab === "general" ? "bg-green-600 text-white" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    onClick={() => setActiveFaqTab("general")}
                  >
                    General
                  </Button>
                  <Button
                    className={`px-4 py-2 rounded-md ${activeFaqTab === "venues" ? "bg-green-600 text-white" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    onClick={() => setActiveFaqTab("venues")}
                  >
                    Venues
                  </Button>
                  <Button
                    className={`px-4 py-2 rounded-md ${activeFaqTab === "matches" ? "bg-green-600 text-white" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    onClick={() => setActiveFaqTab("matches")}
                  >
                    Matches
                  </Button>
                </div>
                <div className={`space-y-4 ${activeFaqTab === "general" ? "block" : "hidden"}`}>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">What is Sport Cliq?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Sport Cliq is a platform for organizing and joining football matches and venues across Nigeria.
                    </p>
                  </details>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">How do I get started?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      No account needed! Browse matches, organize one, or add a venue using the respective buttons.
                    </p>
                  </details>
                </div>
                <div className={`space-y-4 ${activeFaqTab === "venues" ? "block" : "hidden"}`}>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">How do I add a venue?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Click "Add Venue", fill in details, and upload images to list your venue.
                    </p>
                  </details>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">How are venues ranked?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Venues are ranked by the number of matches hosted, shown as "Match Count".
                    </p>
                  </details>
                </div>
                <div className={`space-y-4 ${activeFaqTab === "matches" ? "block" : "hidden"}`}>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">How do I join a match?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Use the "Join Match" button on the match card to participate.
                    </p>
                  </details>
                  <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                    <summary className="font-semibold cursor-pointer">Can I organize a paid match?</summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Yes, set the price when organizing via the "Organize" page.
                    </p>
                  </details>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <Star className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "Sport Cliq made organizing our weekly matches so easy! The Super Code feature is a game-changer."
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">— John D., Lagos</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <Star className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "I found the perfect venue for our team, and joining matches has never been easier!"
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">— Aisha K., Abuja</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 dark:bg-green-900/50 p-6 rounded-xl shadow-md text-center"
            >
              <Star className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "As a venue owner, Sport Cliq has increased my bookings significantly. Highly recommend!"
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">— Emeka O., Port Harcourt</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Play?</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of players and organizers on Sport Cliq. Start your football journey today!
          </p>
          <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white text-gray-900 placeholder-gray-400 border-none rounded-full px-6 py-3 w-full sm:w-auto"
              required
            />
            <Button type="submit" className="bg-white text-green-600 hover:bg-gray-100 font-semibold px-6 py-3 rounded-full">
              Join the Waitlist
            </Button>
          </form>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Sport Cliq</h3>
              <p className="text-gray-400">
                Your ultimate platform for organizing and joining football matches across Nigeria.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="/matches" className="text-gray-400 hover:text-green-400 transition-colors">Matches</a></li>
                <li><a href="/venues" className="text-gray-400 hover:text-green-400 transition-colors">Venues</a></li>
                <li><a href="/guides" className="text-gray-400 hover:text-green-400 transition-colors">Guides</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="https://twitter.com/PiousGeek" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-6 w-6 text-gray-400 hover:text-green-400 transition-colors" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-6 w-6 text-gray-400 hover:text-green-400 transition-colors" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-6 w-6 text-gray-400 hover:text-green-400 transition-colors" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-400">
            &copy; 2025 Sport Cliq. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Navbar */}
      <div className="sticky bottom-0 z-20">
        <Navbar />
      </div>
    </div>
  );
};

export default Home;
