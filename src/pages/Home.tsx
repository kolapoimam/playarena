import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Trophy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Sample data (replace with API data later)
const featuredMatches = [
  {
    id: 1,
    title: "Frifay Night Football",
    date: "May 30, 2025, 4:14 PM",
    venue: "Eko Football Park",
    image: "https://via.placeholder.com/400x200?text=Match+1",
  },
  {
    id: 2,
    title: "Weekend Soccer Clash",
    date: "May 31, 2025, 2:00 PM",
    venue: "Lagos Stadium",
    image: "https://via.placeholder.com/400x200?text=Match+2",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const [stats] = useState({
    totalMatches: 1500,
    totalUsers: 5000,
    totalVenues: 200,
  });

  // Carousel settings
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <div className="min-h-screen bg-gray-50 font-nunito">
      {/* Hero Section */}
      <div
        className="relative h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url(https://via.placeholder.com/1920x1080?text=Sport+Cliq+Hero)",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center text-white"
          >
            <h1 className="text-5xl font-bold mb-4">Welcome to Sport Cliq</h1>
            <p className="text-xl mb-6">Join the Ultimate Sports Community!</p>
            <div className="space-x-4">
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => navigate("/matches")}
              >
                Join a Match <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-green-600"
                onClick={() => navigate("/venues")}
              >
                Explore Venues
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Featured Matches Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-gray-900 text-center mb-8">Featured Matches</h2>
          <Slider {...sliderSettings}>
            {featuredMatches.map((match) => (
              <motion.div
                key={match.id}
                className="p-4"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-gray-100 rounded-lg overflow-hidden shadow-md">
                  <img
                    src={match.image}
                    alt={match.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-medium text-gray-900">{match.title}</h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" /> {match.date}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> {match.venue}
                    </p>
                    <Button
                      className="mt-4 bg-green-600 text-white w-full"
                      onClick={() => navigate(`/match/${match.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </Slider>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8">Our Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(stats).map(([key, value]) => (
              <motion.div
                key={key}
                className="p-6 bg-white rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * Object.keys(stats).indexOf(key) }}
              >
                {key === "totalMatches" && <Trophy className="h-12 w-12 text-green-600 mx-auto mb-2" />}
                {key === "totalUsers" && <Users className="h-12 w-12 text-green-600 mx-auto mb-2" />}
                {key === "totalVenues" && <MapPin className="h-12 w-12 text-green-600 mx-auto mb-2" />}
                <h3 className="text-xl font-bold">{value.toLocaleString()}</h3>
                <p className="text-gray-600 capitalize">{key.replace("total", "")}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-12 bg-green-600 text-white text-center">
        <h2 className="text-3xl font-semibold mb-4">Ready to Play?</h2>
        <p className="text-lg mb-6">Join matches, organize events, and connect with players worldwide.</p>
        <Button
          className="bg-white text-green-600 hover:bg-gray-200"
          onClick={() => navigate("/matches")}
        >
          Get Started <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </div>
  );
};

export default Home;
