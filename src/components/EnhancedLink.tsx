import React, { useRef, useEffect } from 'react';
import FaceTracker, { FaceTrackerRef } from './FaceTracker.tsx';

interface EnhancedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const EnhancedLink: React.FC<EnhancedLinkProps> = ({ 
  href, 
  children, 
  className = '', 
  onClick 
}) => {
  const faceTrackerRef = useRef<FaceTrackerRef>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Trigger eyebrow raise
    if (faceTrackerRef.current) {
      faceTrackerRef.current.raiseEyebrows();
    }
    
    // Wait for eyebrow raise animation, then navigate
    setTimeout(() => {
      if (onClick) {
        onClick(e);
      }
      window.location.href = href;
    }, 800);
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
      {/* Hidden face tracker for eyebrow raises */}
      <div style={{ display: 'none' }}>
        <FaceTracker ref={faceTrackerRef} width={50} height={50} />
      </div>
    </a>
  );
};

export default EnhancedLink;
