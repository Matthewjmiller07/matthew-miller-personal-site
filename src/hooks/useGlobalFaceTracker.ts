import React from 'react';
import FaceTracker, { type FaceTrackerRef } from '../components/FaceTracker.tsx';

// Global ref to track face tracker instances
const globalFaceTrackers: React.RefObject<FaceTrackerRef>[] = [];

export const registerFaceTracker = (ref: React.RefObject<FaceTrackerRef>) => {
  globalFaceTrackers.push(ref);
};

export const unregisterFaceTracker = (ref: React.RefObject<FaceTrackerRef>) => {
  const index = globalFaceTrackers.indexOf(ref);
  if (index > -1) {
    globalFaceTrackers.splice(index, 1);
  }
};

export const raiseAllEyebrows = () => {
  globalFaceTrackers.forEach(ref => {
    if (ref.current) {
      ref.current.raiseEyebrows();
    }
  });
};

// Hook to handle link clicks with eyebrow raise
export const useEyebrowRaiseNavigation = () => {
  const handleLinkClick = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Raise eyebrows on all face trackers
    raiseAllEyebrows();
    
    // Navigate after animation
    setTimeout(() => {
      window.location.href = href;
    }, 800);
  };

  return { handleLinkClick };
};
