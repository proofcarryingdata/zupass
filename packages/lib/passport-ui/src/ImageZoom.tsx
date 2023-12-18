import mediumZoom, { Zoom, ZoomOptions } from "medium-zoom";
import { ComponentProps, useCallback, useRef } from "react";

type ImageZoomProps = ComponentProps<"img"> & {
  options?: ZoomOptions;
};

export function ImageZoom({ options, ...props }: ImageZoomProps) {
  const zoomRef = useRef<Zoom | null>(null);

  const getZoom = useCallback(() => {
    if (zoomRef.current === null) {
      zoomRef.current = mediumZoom(options);
    }

    return zoomRef.current;
  }, [options]);

  const attachZoom = useCallback(
    (image: HTMLImageElement | null) => {
      const zoom = getZoom();

      if (image) {
        zoom.attach(image);
      } else {
        zoom.detach();
      }
    },
    [getZoom]
  );

  return <img {...props} ref={attachZoom} />;
}
