import React from 'react';
import LoadingFootball from './LoadingFootball';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <LoadingFootball isLoading={true} size={{ base: 250, md: 300, lg: 350 }} />
    </div>
  );
};

export default SplashScreen;
