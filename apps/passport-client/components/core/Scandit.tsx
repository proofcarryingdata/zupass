import { sleep } from "@pcd/util";
import { useEffect } from "react";
import * as SDCBarcode from "scandit-web-datacapture-barcode";
import * as SDCCore from "scandit-web-datacapture-core";
import { appConfig } from "../../src/appConfig";

const licenseKey = appConfig.scanditLicenseKey;

export const ScanditScanner = ({
  onScan
}: {
  onScan: (data: string) => void;
}): JSX.Element => {
  useEffect(() => {
    async function runScanner(): Promise<void> {
      await SDCCore.configure({
        licenseKey: licenseKey,
        libraryLocation: "/engine",
        moduleLoaders: [SDCBarcode.barcodeCaptureLoader()]
      });

      const context = await SDCCore.DataCaptureContext.create();

      const camera = SDCCore.Camera.default;
      await context.setFrameSource(camera);

      const settings = new SDCBarcode.BarcodeCaptureSettings();
      settings.enableSymbologies([SDCBarcode.Symbology.QR]);

      const symbologySetting = settings.settingsForSymbology(
        SDCBarcode.Symbology.Code39
      );
      symbologySetting.activeSymbolCounts = [
        7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
      ];

      const barcodeCapture = await SDCBarcode.BarcodeCapture.forContext(
        context,
        settings
      );
      await barcodeCapture.setEnabled(false);

      barcodeCapture.addListener({
        didScan: async (barcodeCapture, session) => {
          await barcodeCapture.setEnabled(false);
          const barcode = session.newlyRecognizedBarcodes[0];
          onScan(new String(barcode.data).toString());
          await sleep(1000);
          await barcodeCapture.setEnabled(true);
        }
      });

      const view = await SDCCore.DataCaptureView.forContext(context);
      view.connectToElement(
        document.getElementById("data-capture-view") as HTMLElement
      );
      view.addControl(new SDCCore.CameraSwitchControl());

      const barcodeCaptureOverlay =
        await SDCBarcode.BarcodeCaptureOverlay.withBarcodeCaptureForViewWithStyle(
          barcodeCapture,
          view,
          SDCBarcode.BarcodeCaptureOverlayStyle.Frame
        );

      const viewfinder = new SDCCore.RectangularViewfinder(
        SDCCore.RectangularViewfinderStyle.Square,
        SDCCore.RectangularViewfinderLineStyle.Light
      );

      await barcodeCaptureOverlay.setViewfinder(viewfinder);

      await camera.switchToDesiredState(SDCCore.FrameSourceState.On);
      await barcodeCapture.setEnabled(true);
    }

    runScanner().catch((error) => {
      console.error(error);
      alert(error);
    });
  }, [onScan]);

  return (
    <div
      id="data-capture-view"
      style={{ height: window.innerHeight - 250, width: "100%" }}
    ></div>
  );
};
