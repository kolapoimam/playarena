
import { Plus, Check, Store, Pencil } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import MatchCard from "@/components/MatchCard";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import VenueItem from "@/components/VenueItem";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  // Sample data
  const upcomingMatches = [
    {
      title: "Lagos Derby",
      details: "Free, 5-a-side",
      image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Abuja Challenge",
      details: "Paid, 11-a-side",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    }
  ];
  
  const popularVenues = [
    {
      name: "National Stadium",
      location: "Lagos, 20 slots",
      image: "https://images.unsplash.com/photo-1571056642329-4f49f8af6443?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      name: "Eko Football Park",
      location: "Lagos, 15 slots",
      image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    }
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">PlayArena</h1>
        <ThemeToggle />
      </header>

      {/* Search Bar */}
      <div className="px-4 mb-6">
        <SearchBar />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-8">
        <ActionButton 
          icon={Plus} 
          label="Host Match" 
          href="/host" 
        />
        <ActionButton 
          icon={Check} 
          label="Join Match" 
          href="/join" 
        />
        <ActionButton 
          icon={Store} 
          label="Create Venue" 
          href="/venue" 
        />
        <ActionButton 
          icon={Pencil} 
          label="Register" 
          href="/register" 
        />
      </div>

      {/* Upcoming Matches */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold px-4 mb-3">Upcoming Matches</h2>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4">
          {upcomingMatches.map((match, index) => (
            <div key={index} className="min-w-[280px]">
              <MatchCard 
                title={match.title}
                details={match.details}
                image={match.image}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Popular Venues */}
      <section>
        <h2 className="text-2xl font-bold px-4 mb-3">Popular Venues</h2>
        <div className="px-4 space-y-3">
          {popularVenues.map((venue, index) => (
            <VenueItem
              key={index}
              name={venue.name}
              location={venue.location}
              image={venue.image}
            />
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  );
};

export default Index;
