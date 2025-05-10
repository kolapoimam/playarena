
import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <input
        type="text"
        className="pl-12 pr-4 py-3 w-full rounded-full bg-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
        placeholder="Search matches"
      />
    </div>
  );
}
