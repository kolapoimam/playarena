import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";
import { BrandMark, Pill } from "@/components/sc/ui";

interface MobileOnlyGuardProps {
  children: React.ReactNode;
}

const MobileOnlyGuard: React.FC<MobileOnlyGuardProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  // Shared highlights links are public pages, so they open on any screen
  const { pathname } = useLocation();
  const publicPage = pathname.startsWith("/highlights/");

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|iphone|ipod|windows phone|blackberry|mobile/.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768; // Mobile screens typically 768px or less

      // Consider it mobile only if it's a mobile device AND has a small screen
      setIsMobile(isMobileDevice && isSmallScreen);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    QRCode.toDataURL(window.location.origin, { margin: 0, width: 240, color: { dark: "#0E1411", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [isMobile]);

  if (!isMobile && !publicPage) {
    return (
      <div className="fixed inset-0 z-50 bg-sc-bg text-sc-ink font-sans flex items-center justify-center p-12 overflow-auto">
        <div className="flex items-center gap-14 max-w-4xl flex-wrap justify-center">
          <div className="w-[220px] h-[420px] rounded-[40px] bg-sc-green flex flex-col items-center justify-center gap-3.5 shadow-[0_24px_48px_rgba(14,20,17,0.18)] shrink-0">
            <BrandMark size={84} />
            <span className="text-[22px] font-extrabold text-sc-green-ink">SportCliq</span>
          </div>
          <div className="flex flex-col gap-4 max-w-[440px]">
            <Pill sport="guide" icon={Smartphone}>Mobile only</Pill>
            <h1 className="m-0 text-[40px] leading-[46px] font-extrabold tracking-[-0.035em]">SportCliq lives on your phone</h1>
            <p className="m-0 text-[17px] leading-[26px] text-sc-ink2">
              Open {window.location.host} on your phone and add it to your home screen to install the app.
            </p>
            <div className="flex gap-4 items-center bg-white rounded-[22px] p-3.5 mt-2">
              {qr ? (
                <img src={qr} alt="QR code to open SportCliq on your phone" className="w-24 h-24" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-sc-soft" />
              )}
              <span className="text-[15px] leading-[22px] text-sc-ink2">
                <b className="text-sc-ink">Scan to open</b>
                <br />
                Point your phone camera at the code
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileOnlyGuard;
