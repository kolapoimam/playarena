import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Input
          type="text"
          className="pl-4 pr-24 py-5 w-full rounded-lg border border-sc-line focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Matches, Venues..."
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
            setSearchTerm(value);
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <Button
            type="submit"
            className="h-[calc(100%-8px)] rounded-full bg-sc-green hover:brightness-95 text-sc-green-ink px-4 m-1 font-bold"
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
