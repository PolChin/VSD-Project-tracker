
import React from 'react';

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-indigo-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Matrix-like subtle background animation */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="grid grid-cols-12 gap-4 h-full w-full">
          {Array.from({ length: 48 }).map((_, i) => (
            <div 
              key={i} 
              className="w-px bg-white animate-pulse" 
              style={{ 
                height: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }} 
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center">
        <div className="w-24 h-24 border-4 border-indigo-400 border-t-white rounded-full animate-spin mb-8 mx-auto shadow-2xl shadow-indigo-500/50"></div>
        <h2 className="text-white text-2xl font-bold tracking-widest uppercase animate-pulse">
          {message}
        </h2>
        <p className="text-indigo-300 mt-2 font-mono text-sm">INITIALIZING SECURE LINK...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
