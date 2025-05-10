
import Navbar from "@/components/Navbar";

const Profile = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="p-4">
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>
      
      <div className="flex flex-col items-center justify-center h-[70vh] p-4 space-y-4">
        <p className="text-center">
          PlayArena does not require accounts. You can use the app freely without signing up.
        </p>
        <p className="text-center text-muted-foreground">
          Your preferences are saved locally on your device.
        </p>
      </div>

      <Navbar />
    </div>
  );
};

export default Profile;
