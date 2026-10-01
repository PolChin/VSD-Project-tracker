
import React from 'react';

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
        <h2 className="text-base font-semibold">
          {message}
        </h2>
      </div>
    </div>
  );
};

export default LoadingScreen;
