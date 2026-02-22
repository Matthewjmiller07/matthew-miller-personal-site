import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { useGazeTracking } from '../hooks/useGazeTracking';
import { registerFaceTracker, unregisterFaceTracker } from '../hooks/useGlobalFaceTracker';

interface FaceTrackerProps {
  width?: number;
  height?: number;
  basePath?: string;
  showDebug?: boolean;
  className?: string;
}

export interface FaceTrackerRef {
  raiseEyebrows: () => void;
}

const FaceTracker = forwardRef<FaceTrackerRef, FaceTrackerProps>(({
  width = 256,
  height = 256,
  basePath = '/faces/',
  showDebug = false,
  className = ''
}, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { currentImage, isLoading, error, gazePosition, raiseEyebrows } = useGazeTracking(containerRef, basePath);

  // Create a ref for this instance
  const selfRef = useRef<FaceTrackerRef>(null);

  // Expose the raiseEyebrows function to parent
  useImperativeHandle(ref, () => ({
    raiseEyebrows
  }), [raiseEyebrows]);

  // Expose to self for global registration
  useImperativeHandle(selfRef, () => ({
    raiseEyebrows
  }), [raiseEyebrows]);

  // Register/unregister globally
  useEffect(() => {
    registerFaceTracker(selfRef);
    return () => {
      unregisterFaceTracker(selfRef);
    };
  }, []);

  // Get scroll position for debug info
  const [scrollY, setScrollY] = React.useState(0);
  React.useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for eyebrow raise events
  React.useEffect(() => {
    const handleEyebrowRaiseEvent = () => {
      raiseEyebrows();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('raiseEyebrows', handleEyebrowRaiseEvent);
      return () => {
        container.removeEventListener('raiseEyebrows', handleEyebrowRaiseEvent);
      };
    }
  }, [raiseEyebrows]);

  return (
    <div 
      ref={containerRef}
      className={`face-tracker ${className}`}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        background: '#f0f0f0',
        borderRadius: '50%'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666'
        }}>
          Loading...
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'red',
          textAlign: 'center',
          fontSize: '12px'
        }}>
          Error: {error.message}
        </div>
      )}
      
      {currentImage && !isLoading && !error && (
        <img 
          src={currentImage} 
          alt="Interactive face that follows cursor"
          className="face-image"
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover'
          }}
          onLoad={() => console.log('Face image loaded:', currentImage)}
          onError={(e) => {
            console.error('Face image failed to load:', currentImage, e);
            console.error('Error details:', e);
          }}
        />
      )}
      
      {showDebug && (
        <div className="face-debug" style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <div>Image: {currentImage?.split('/').pop() || 'None'}</div>
          <div>Gaze: ({gazePosition.x.toFixed(1)}, {gazePosition.y.toFixed(1)})</div>
          <div>Scroll: {scrollY}px</div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Error: {error ? error.message : 'None'}</div>
          <div>Status: {isLoading ? 'Loading' : error ? 'Error' : 'Ready'}</div>
        </div>
      )}
    </div>
  );
});

export default FaceTracker;
export type { FaceTrackerRef };
