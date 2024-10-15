import { useEffect, useRef, useState } from "react";

interface UseTrackpadSwipeProps {
  isEnabled: boolean;
  itemCount: number;
}

export const useTrackpadSwipe = ({
  isEnabled,
  itemCount
}: UseTrackpadSwipeProps): {
  containerRef: React.RefObject<HTMLDivElement>;
  activeIdx: number;
  setActiveIdx: React.Dispatch<React.SetStateAction<number>>;
} => {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) return;

    let wheelTimeout: NodeJS.Timeout;
    let lastWheelTime = 0;
    // ms - Minimum time between wheel events to process
    const wheelThreshold = 50;

    const handleWheel = (e: WheelEvent): void => {
      // Prevent default scrolling behavior
      e.preventDefault();
      const now = Date.now();
      // Throttle wheel events to prevent over-sensitivity
      if (now - lastWheelTime < wheelThreshold) {
        return;
      }

      lastWheelTime = now;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        // Check if swipe is significant enough and we're not at the end of the list
        if (e.deltaX > 50 && activeIdx < itemCount - 1) {
          setActiveIdx((prevIdx) => prevIdx + 1);
        } else if (e.deltaX < -50 && activeIdx > 0) {
          setActiveIdx((prevIdx) => prevIdx - 1);
        }
      }, 50);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [activeIdx, isEnabled, itemCount]);

  return {
    containerRef,
    activeIdx,
    setActiveIdx
  };
};
