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
    const wheelThreshold = 500; // ms - Minimum time between wheel events to process
    const swipeThreshold = 5; // Swipe sensitivity threshold

    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const now = Date.now();

      if (now - lastWheelTime < wheelThreshold) {
        return;
      }

      lastWheelTime = now;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(e.deltaX) > swipeThreshold) {
          setActiveIdx((prevIdx) => {
            if (e.deltaX > 0) {
              return Math.min(prevIdx + 1, itemCount - 1);
            } else {
              return Math.max(prevIdx - 1, 0);
            }
          });
        }
      }, 50);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isEnabled, itemCount]);

  return {
    containerRef,
    activeIdx,
    setActiveIdx
  };
};
