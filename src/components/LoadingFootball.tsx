import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LoadingFootballProps {
  isLoading?: boolean;
  size?: {
    base: number;
    md: number;
    lg: number;
  };
}

const LoadingFootball: React.FC<LoadingFootballProps> = ({ 
  isLoading = true,
  size = { base: 250, md: 300, lg: 350 } // Increased sizes for a bigger animation
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className={`
        w-[${size.base}px]
        md:w-[${size.md}px]
        lg:w-[${size.lg}px]
        h-[${size.base}px]
        md:h-[${size.md}px]
        lg:h-[${size.lg}px]
      `}>
        <DotLottieReact
          src="https://lottie.host/22d944dc-f5f2-4ca1-8d2c-8c679d53ce41/GmJWuhR4FA.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default LoadingFootball;
