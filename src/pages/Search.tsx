
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";

const Search = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="p-4">
        <h1 className="text-2xl font-bold mb-4">Find Matches</h1>
        <SearchBar />
      </header>
      
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-muted-foreground text-center p-4">
          Enter a search term above to find matches nearby
        </p>
      </div>

      <Navbar />
    </div>
  );
};

export default Search;
