import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy, Volleyball, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Animated Volleyball Ball */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 animate-bounce">
            <Volleyball className="w-full h-full text-primary" />
          </div>
        </div>

        {/* 404 Text */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold">Oops! The Ball Went Out of Bounds!</h2>
          <p className="text-muted-foreground text-lg">
            Looks like this page took a wrong turn and ended up in the stands. 
            Even Messi would have trouble finding this one!
          </p>
        </div>

        {/* Fun Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-background/50 p-4 rounded-lg border">
            <Goal className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              This page has been missing for longer than Arsenal's Premier League title hopes
            </p>
          </div>
          <div className="bg-background/50 p-4 rounded-lg border">
            <Volleyball className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Even VAR couldn't help us find this page
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-4">
          <Button 
            onClick={() => navigate(-1)} 
            className="gap-2"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to the Game
          </Button>
        </div>

        {/* Fun Footer */}
        <p className="text-sm text-muted-foreground mt-8">
          Don't worry, our team is on the bench warming up to fix this!
        </p>
      </div>
    </div>
  );
}
