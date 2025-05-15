import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Importing the Button component

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <Input
        type="text"
        className="pl-12 pr-24 py-2 w-full rounded-full bg-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
        placeholder="Matches, Venues..."
        value={searchTerm}
        onChange={(e) => {
          const value = e.target.value.replace(/[^A-Za-z\s]/g, ""); // Allow only alphabetical characters and spaces
          setSearchTerm(value);
        }}
      />
      <Button
        type="submit"
        size="sm"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white rounded-full px-4"
      >
        Search
      </Button>
    </form>
  );
}
