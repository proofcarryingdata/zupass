import {
  BarcodeReader,
  CodeDetection,
  Configuration,
  StrichSDK
} from "@pixelverse/strichjs-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { appConfig } from "../../src/appConfig";

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
      audio: true,
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
  const [sdkState, setSdkState] = useState(
    StrichSDK.isInitialized() ? "initialized" : undefined
  );

  // a reference to a BarcodeReader
  const barcodeReaderRef = useRef<BarcodeReader | null>(null);

  // this effect has no dependencies, so it should run only once (except if React StrictMode is on)
  useEffect(() => {
    const initializeSDK = async (): Promise<void> => {
      if (StrichSDK.isInitialized()) {
        setSdkState("initialized");
      } else {
        try {
          await StrichSDK.initialize(appConfig.strichLicenseKey);
          console.log(`STRICH SDK initialized successfully`);
          setSdkState("initialized");
        } catch (e) {
          console.error(`Failed to initialize STRICH SDK: ${e}`);
          setSdkState("initialization-error");
        }
      }
    };

    // run async initialization
    if (sdkState === undefined) {
      setSdkState("initializing");
      initializeSDK();
    }
  }, [sdkState]);

  // BarcodeReader creation, once SDK is initialized
  useEffect(() => {
    if (sdkState === "initialized" && barcodeReaderRef.current === null) {
      const barcodeReaderInitialization = async (): Promise<void> => {
        console.log(`Initializing BarcodeReader...`);

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
          console.log(`Destroying BarcodeReader`);
          barcodeReaderRef.current.destroy();
          barcodeReaderRef.current = null;
        }
      };
    }
  }, [addDetection, sdkState]);

  // the component acts as the STRICH BarcodeReader host element
  return (
    <div ref={hostElemRef} style={{ position: "relative", height: "500px" }} />
  );
}

/**
 * Component hosting the scanner
 */
export function Scanner({
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
  return (
    <div>
      <ScannerHost addDetection={addDetection} />
    </div>
  );
}

export default Scanner;
