import React from 'react';
import Lottie from 'lottie-react';
import animationData from '/src/assets/Animation - 1747210785646.json';

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
  size = { base: 150, md: 200, lg: 250 }
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`
        w-[${size.base}px]
        md:w-[${size.md}px]
        lg:w-[${size.lg}px]
        h-[${size.base}px]
        md:h-[${size.md}px]
        lg:h-[${size.lg}px]
      `}>
        <Lottie 
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid meet'
          }}
        />
      </div>
    </div>
  );
};

export default LoadingFootball;
