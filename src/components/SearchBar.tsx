import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="relative w-full max-w-md mx-auto">
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          className="pl-10 pr-24 py-5 w-full rounded-full bg-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
          placeholder="Matches, Venues..."
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
            setSearchTerm(value);
          }}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white rounded-full px-4 h-8"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
