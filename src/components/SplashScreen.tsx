import React from "react";
import { BrandMark } from "@/components/sc/ui";

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-sc-green overflow-hidden font-sans">
      {[260, 420, 600].map((d, i) => (
        <span
          key={d}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: d,
            height: d,
            marginLeft: -d / 2,
            marginTop: -d / 2,
            border: `1.5px solid rgba(255,255,255,${[0.22, 0.15, 0.09][i]})`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <BrandMark size={112} className="drop-shadow-[0_12px_24px_rgba(5,46,22,0.25)] animate-[sc-pop_0.6s_ease-out]" />
        <span className="text-[36px] font-extrabold tracking-[-0.04em] text-sc-green-ink">SportCliq</span>
        <span className="text-base font-bold text-white/85">Play. Ride. Book. Repeat.</span>
      </div>
      <div className="absolute left-0 right-0 bottom-16 flex justify-center gap-2" aria-hidden="true">
        <span className="w-6 h-2 rounded-full bg-white animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-white/40" />
        <span className="w-2 h-2 rounded-full bg-white/40" />
      </div>
      <style>{`
        @keyframes sc-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default SplashScreen;
