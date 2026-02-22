import { useRef, useEffect, useState } from 'react';

// Configuration - must match your generation parameters!
const P_MIN = -15;  // Same as --min
const P_MAX = 15;   // Same as --max
const STEP = 15;    // Same as --step (we only have -15, 0, 15 positions)
const SIZE = 256;   // Same as --size

interface GazeTrackingState {
  currentImage: string | null;
  isLoading: boolean;
  error: Error | null;
  gazePosition: { x: number; y: number };
  raiseEyebrows: () => void; // New function to trigger eyebrow raise
}

export const useGazeTracking = (
  containerRef: React.RefObject<HTMLElement>,
  basePath: string = '/faces/'
): GazeTrackingState => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Eyebrow raise function
  const raiseEyebrows = () => {
    // Use the current gaze position to show the matching raised eyebrow image
    const currentGazeX = Math.round(gazePosition.x / STEP) * STEP;
    const currentGazeY = Math.round(gazePosition.y / STEP) * STEP;
    
    // Animate eyebrow up and down for the current gaze position
    const eyebrowSequence = [-10, -5, 0, 5, 10, 15, 10, 5, 0, -5, -10]; // Up and down animation
    let currentIndex = 0;
    
    const animateEyebrows = () => {
      if (currentIndex < eyebrowSequence.length) {
        const eyebrowValue = eyebrowSequence[currentIndex];
        const raisedImage = `${basePath}gaze_px${currentGazeX}_py${currentGazeY}_eyebrow${eyebrowValue}_256.webp`;
        setCurrentImage(raisedImage);
        
        currentIndex++;
        setTimeout(animateEyebrows, 100); // 100ms between frames
      } else {
        // Return to normal gaze position after animation
        setTimeout(() => {
          updateGaze(mousePosition.x, mousePosition.y, window.scrollY);
        }, 100);
      }
    };
    
    animateEyebrows();
  };

  // Combined gaze calculation function
  const updateGaze = (mouseX: number, mouseY: number, scrollY: number = 0) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate relative position (-1 to 1) for mouse
    const relativeX = (mouseX - centerX) / (rect.width / 2);
    const relativeY = (mouseY - centerY) / (rect.height / 2);

    // Clamp values to [-1, 1]
    const clampedX = Math.max(-1, Math.min(1, relativeX));
    const clampedY = Math.max(-1, Math.min(1, relativeY));

    // Add scroll influence to vertical gaze
    // When scrolling down, eyes look down; when scrolling up, eyes look up
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollRatio = maxScroll > 0 ? scrollY / maxScroll : 0;
    
    // Ultra-aggressive scroll tracking
    // ANY scroll down = full down gaze (py15), ANY scroll up = full up gaze (py-15)
    let scrollInfluence = 0;
    if (scrollY > 5) { // If scrolled down more than 5px (extremely sensitive)
      scrollInfluence = 1.5; // Force to py15 (looking down)
    } else if (scrollY < -5) { // If scrolled up (negative, unlikely but possible)
      scrollInfluence = -1.5; // Force to py-15 (looking up)
    }
    
    const adjustedY = clampedY + scrollInfluence;

    // Convert to gaze coordinates
    const gazeX = clampedX * P_MAX;
    const gazeY = -adjustedY * P_MAX;  // Invert Y for correct vertical tracking

    setGazePosition({ x: gazeX, y: gazeY });

    // Find nearest grid point - only use positions we have
    let snappedX = 0;
    let snappedY = 0;
    
    if (Math.abs(gazeX) > 7.5) {
      snappedX = gazeX > 0 ? 15 : -15;
    }
    
    if (Math.abs(gazeY) > 7.5) {
      snappedY = gazeY > 0 ? 15 : -15;
    }

    // Generate filename
    const filename = `${basePath}gaze_px${snappedX}_py${snappedY}_${SIZE}.webp`;
    setCurrentImage(filename);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let isTracking = true;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isTracking || !container) return;
      
      setMousePosition({ x: event.clientX, y: event.clientY });
      updateGaze(event.clientX, event.clientY, window.scrollY);
    };

    const handleScroll = () => {
      if (!isTracking || !container) return;
      
      // Use current mouse position but update with new scroll position
      // If mouse position is (0,0), use center of container as fallback
      const mouseX = mousePosition.x || (container.getBoundingClientRect().left + container.offsetWidth / 2);
      const mouseY = mousePosition.y || (container.getBoundingClientRect().top + container.offsetHeight / 2);
      
      updateGaze(mouseX, mouseY, window.scrollY);
    };

    // Handle keyboard events for arrow keys
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTracking || !container) return;
      
      let scrollDirection = 0;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        scrollDirection = 50; // Simulate scrolling down (enough to trigger py15)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        scrollDirection = -50; // Simulate scrolling up (enough to trigger py-15)
      } else if (event.key === 'Home') {
        scrollDirection = -window.scrollY; // Go to top
      } else if (event.key === 'End') {
        scrollDirection = (document.documentElement.scrollHeight - window.innerHeight) - window.scrollY; // Go to bottom
      }
      
      if (scrollDirection !== 0) {
        const mouseX = mousePosition.x || (container.getBoundingClientRect().left + container.offsetWidth / 2);
        const mouseY = mousePosition.y || (container.getBoundingClientRect().top + container.offsetHeight / 2);
        updateGaze(mouseX, mouseY, window.scrollY + scrollDirection);
      }
    };

    // Handle mobile touch scroll more aggressively
    const handleTouchMove = (event: TouchEvent) => {
      if (!isTracking || !container || event.touches.length === 0) return;

      const touch = event.touches[0];
      setMousePosition({ x: touch.clientX, y: touch.clientY });
      updateGaze(touch.clientX, touch.clientY, window.scrollY);
      
      // Force scroll update on touch move for better mobile responsiveness
      handleScroll();
    };

    const handleMouseLeave = () => {
      // Return to center when mouse leaves
      const centerFilename = `${basePath}gaze_px0_py0_${SIZE}.webp`;
      setCurrentImage(centerFilename);
      setGazePosition({ x: 0, y: 0 });
    };

    // Set initial image to center
    const centerFilename = `${basePath}gaze_px0_py0_${SIZE}.webp`;
    setCurrentImage(centerFilename);
    setIsLoading(false);

    // Throttled scroll handler for better mobile performance
    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 16); // ~60fps
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', throttledScroll, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      isTracking = false;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', throttledScroll);
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, basePath]);

  return {
    currentImage,
    isLoading,
    error,
    gazePosition,
    raiseEyebrows
  };
};
