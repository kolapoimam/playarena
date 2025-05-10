
import Navbar from "@/components/Navbar";

const Matches = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="p-4">
        <h1 className="text-2xl font-bold">My Matches</h1>
      </header>
      
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-muted-foreground text-center p-4">
          Create or join matches to see them here
        </p>
      </div>

      <Navbar />
    </div>
  );
};

export default Matches;
