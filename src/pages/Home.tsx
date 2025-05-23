import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Sample data (replace with real data or API later)
const initialWaitlistCount = 1234;

const Home = () => {
  const [waitlistCount, setWaitlistCount] = useState(initialWaitlistCount);
  const [email, setEmail] = useState("");

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
      alert(`Thank you, ${email}! You've joined the waitlist.`);
      setEmail("");
      // Replace with API call to save email
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-nunito overflow-hidden">
      {/* Hero Section */}
      <div
        className="relative h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url(https://via.placeholder.com/1920x1080?text=Colorful+Sports+Scene)",
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
              className="text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-yellow-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              Sport Cliq
            </motion.h1>
            <p className="text-2xl mb-6">The Future of Sports Communities is Coming!</p>
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

      {/* Waitlist Section */}
      <section id="waitlist" className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Be the First to Join</h2>
          <p className="text-lg text-gray-600 mb-8">
            Over {waitlistCount.toLocaleString()} people are already on the waitlist. Sign up now for exclusive access!
          </p>
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-4">
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
            className="mt-8 text-2xl text-green-600 font-semibold"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Users className="inline h-8 w-8 mr-2" /> {waitlistCount.toLocaleString()} Sign-ups!
          </motion.div>
        </div>
      </section>

      {/* Teaser Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8">What’s Coming?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Vibrant Community",
                image: "https://via.placeholder.com/300x200?text=Community",
                description: "Connect with players worldwide.",
              },
              {
                title: "Exciting Events",
                image: "https://via.placeholder.com/300x200?text=Events",
                description: "Organize and join epic matches.",
              },
              {
                title: "Stunning Venues",
                image: "https://via.placeholder.com/300x200?text=Venues",
                description: "Discover top locations to play.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-lg overflow-hidden shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="text-xl font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-800 text-white text-center">
        <p className="text-sm">© 2025 Sport Cliq. All rights reserved.</p>
        <p className="text-sm mt-2">Follow us on social media for updates!</p>
      </footer>
    </div>
  );
};

export default Home;
