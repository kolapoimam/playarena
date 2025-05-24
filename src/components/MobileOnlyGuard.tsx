import React, { useEffect, useState } from "react";

interface MobileOnlyGuardProps {
  children: React.ReactNode;
}

const MobileOnlyGuard: React.FC<MobileOnlyGuardProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|iphone|ipod|windows phone|blackberry|mobile/.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768; // Mobile screens typically 768px or less

      // Consider it mobile only if it's a mobile device AND has a small screen
      setIsMobile(isMobileDevice && isSmallScreen);
    };

    // Check on mount
    checkDevice();

    // Recheck on window resize
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!isMobile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-yellow-400 to-orange-500 z-50 overflow-hidden">
        <div className="text-center p-6 max-w-md mx-4">
          <h1 className="text-4xl font-bold text-white mb-4 animate-bounce">
            🚨 Oops! 🚨
          </h1>
          
          <div className="text-lg text-white mb-6 space-y-3">
            <p>
             Yo Fam, big-screen explorer! Our site is a mobile-only party, 
              and your device is trying to gate crash!
            </p>
            
            <p>
              Grab your phone (you know, that tiny screen you're always glued to 📱) 
              and join the fun.
            </p>
            
            <p>
              iPads and desktops? They're not invited, no vex, they're just too 
              "massive" for our vibe! 😜
            </p>
          </div>
          
          <div className="animate-pulse">
            <span className="inline-block px-4 py-2 bg-white text-orange-500 font-semibold rounded-full shadow-lg">
              Switch to Mobile!
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileOnlyGuard;
