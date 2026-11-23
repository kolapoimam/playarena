import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users, Package, ShoppingBag, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Sample data (replace with real data or API later)
const initialWaitlistCount = 1234;

const Home = () => {
  const [waitlistCount, setWaitlistCount] = useState(initialWaitlistCount);
  const [email, setEmail] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");

  // Simulate waitlist growth (for demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitlistCount((prev) => prev + 1);
    }, 2000); // Increment every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleJoinWaitlist = (e) => {
    e.preventDefault();
    if (email) {
      alert(`Thank you, ${email}! You've joined the Sport Cliq waitlist.`);
      setEmail("");
      // Replace with API call to save email
    }
  };

  const handleBusinessSignup = (e) => {
    e.preventDefault();
    if (businessLocation) {
      alert(`Thank you! Early access for your business at ${businessLocation} is requested.`);
      setBusinessLocation("");
      // Replace with API call to save business request
    }
  };

  return (
    <div className="min-h-screen bg-sc-bg font-nunito overflow-hidden">
      {/* Hero Section */}
      <div
        className="relative h-screen bg-cover bg-center"
        style={{
          backgroundImage: "ur[](https://via.placeholder.com/1920x1080?text=Colorful+Sports+Scene)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center text-white"
          >
            <motion.h1
              className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-yellow-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              Sport Cliq
            </motion.h1>
            <p className="text-2xl mb-6">The Ultimate Sports Community is Coming!</p>
            <motion.div
              className="space-x-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Button
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600"
                onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              >
                Join the Waitlist <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Feature Highlights */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-sc-ink mb-12">Why Sport Cliq?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Zero Stress",
                icon: <UsersIcon className="h-12 w-12 text-sc-green-dark mx-auto mb-2" />,
                description: "No more organizing hassles. We connect you with the sports you love.",
              },
              {
                title: "Top Quality",
                icon: <Package className="h-12 w-12 text-yellow-500 mx-auto mb-2" />,
                description: "Experience the best matches and venues, sourced with care.",
              },
              {
                title: "Community Vibes",
                icon: <ShoppingBag className="h-12 w-12 text-blue-500 mx-auto mb-2" />,
                description: "Join friends and players for an unbeatable sports experience.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="p-6 bg-sc-soft rounded-3xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                {feature.icon}
                <h3 className="text-xl font-medium text-sc-ink mt-2">{feature.title}</h3>
                <p className="text-sm text-sc-ink3 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist/Business Section */}
      <section id="waitlist" className="py-16 bg-sc-soft">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-sc-ink mb-6">Be the First to Play</h2>
          <p className="text-lg text-sc-ink3 mb-8">
            Over {waitlistCount.toLocaleString()} people are already on the waitlist. Sign up now for exclusive access!
          </p>
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-4 mb-8">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 p-3 rounded-lg"
                required
              />
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600"
              >
                Join Now
              </Button>
            </form>
          </motion.div>
          <motion.div
            className="mt-4 text-2xl text-sc-green-dark font-semibold"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Users className="inline h-8 w-8 mr-2" /> {waitlistCount.toLocaleString()} Sign-ups!
          </motion.div>

          <div className="mt-12">
            <h3 className="text-2xl font-semibold text-sc-ink mb-4">Introducing: Sport Cliq for Teams</h3>
            <p className="text-lg text-sc-ink3 mb-6">
              The better way for teams, clubs, and organizers to automate sports events and player coordination.
            </p>
            <form onSubmit={handleBusinessSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="text"
                placeholder="Where is your team located?"
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
                className="flex-1 p-3 rounded-lg"
                required
              />
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600"
              >
                Get Early Access
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-800 text-white text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm mb-4">Download Sport Cliq to join the revolution</p>
          <div className="flex justify-center space-x-4 mb-4">
            <Button variant="outline" className="text-white border-white">
              Download on Google Play
            </Button>
            <Button variant="outline" className="text-white border-white">
              Download on App Store
            </Button>
          </div>
          <p className="text-sm mb-2">Get the latest sports updates straight to your inbox</p>
          <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mb-4">
            <Input type="text" placeholder="Full name" className="p-2 rounded-lg" />
            <Input type="email" placeholder="Email address" className="p-2 rounded-lg" />
            <Button className="bg-gradient-to-r from-green-500 to-blue-500 text-white">Submit</Button>
          </form>
          <div className="space-y-2">
            <p className="text-sm">COMPANY</p>
            <p className="text-sm">Terms of Use | Privacy Policy</p>
            <p className="text-sm">SOCIAL</p>
            <p className="text-sm">X | Instagram | YouTube | LinkedIn</p>
            <p className="text-sm">LOCATIONS</p>
            <p className="text-sm">Lagos | Abuja | Port Harcourt</p>
            <p className="text-sm mt-2">Get in touch at sportcliqapp@gmail.com</p>
          </div>
          <p className="text-sm mt-4">© 2025 Sport Cliq. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
