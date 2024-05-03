import {
  BarcodeReader,
  CodeDetection,
  Configuration
} from "@pixelverse/strichjs-sdk";
import { useCallback, useEffect, useRef } from "react";
import { useStrichSDKState } from "../../../src/appHooks";

/**
 * Create BarcodeReader configuration
 *
 * @param hostElem The host element hosting the BarcodeReader
 */
function createBarcodeReaderConfig(hostElem: HTMLElement): Configuration {
  return {
    selector: hostElem,
    engine: {
      symbologies: ["qr"],
      duplicateInterval: 2500,
      numScanlines: 20,
      minScanlinesNeeded: 3
    },
    locator: {
      // narrow region of interest for 1D codes
      regionOfInterest: {
        left: 0.05,
        right: 0.05,
        top: 0.05,
        bottom: 0.05
      }
    },
    frameSource: {
      resolution: "hd",
      rememberCameraDeviceId: true
    },
    feedback: {
      audio: false,
      vibration: true
    }
  };
}

function ScannerHost({
  addDetection
}: {
  addDetection: (detection: CodeDetection) => void;
}): JSX.Element {
  // a reference to the BarcodeReader host element
  const hostElemRef = useRef<HTMLDivElement | null>(null);

  // the SDK initialization state
  const sdkState = useStrichSDKState();

  // a reference to a BarcodeReader
  const barcodeReaderRef = useRef<BarcodeReader | null>(null);

  // BarcodeReader creation, once SDK is initialized
  useEffect(() => {
    if (sdkState === "initialized" && barcodeReaderRef.current === null) {
      const barcodeReaderInitialization = async (): Promise<void> => {
        const barcodeReader = new BarcodeReader(
          createBarcodeReaderConfig(hostElemRef.current as HTMLDivElement)
        );
        barcodeReaderRef.current = barcodeReader;
        await barcodeReader.initialize();

        // when a barcode is detected, propagate it up the component tree
        barcodeReader.detected = (detections): void => {
          detections.map((d) => addDetection(d));
        };
        await barcodeReader.start();
      };
      barcodeReaderInitialization();

      // destroy the BarcodeReader in the cleanup function
      return () => {
        if (barcodeReaderRef.current !== null) {
          barcodeReaderRef.current.destroy();
          barcodeReaderRef.current = null;
        }
      };
    }
  }, [addDetection, sdkState]);

  const innerHeight = window.innerHeight;
  // the component acts as the STRICH BarcodeReader host element
  return (
    <div
      ref={hostElemRef}
      style={{ position: "relative", height: `${innerHeight - 200}px` }}
    />
  );
}

/**
 * Component hosting the scanner
 */
export function StrichScanner({
  onResult
}: {
  onResult: (result: string) => void;
}): JSX.Element {
  const addDetection = useCallback(
    (detection: CodeDetection) => {
      onResult(detection.data);
    },
    [onResult]
  );
  return <ScannerHost addDetection={addDetection} />;
}
