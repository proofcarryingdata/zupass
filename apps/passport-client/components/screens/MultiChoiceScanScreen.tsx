import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { QrReader } from "react-qr-reader";
import { useNavigate } from "react-router-dom";
import { SingleValue } from "react-select";
import styled from "styled-components";
import { useLaserScannerKeystrokeInput } from "../../src/appHooks";
import { loadUsingLaserScanner } from "../../src/localstorage";
import { maybeRedirect } from "../../src/util";
import { H5, Spacer, TextCenter } from "../core";
import { ScanditScanner } from "../core/scanners/ScanditScanner";
import { StrichScanner } from "../core/scanners/StrichScanner";
import { AppContainer } from "../shared/AppContainer";
import { IndicateIfOffline } from "../shared/IndicateIfOffline";
import Select from "../shared/Select";
import {
  Back,
  Home
} from "./ScannedTicketScreens/PodboxScannedTicketScreen/PodboxScannedTicketScreen";

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 16px;

  button {
    flex-grow: 1;
  }
`;

// Scan a PCD QR code, then go to /verify to verify and display the proof.
export function MultiChoiceScanScreen(): JSX.Element {
  const usingLaserScanner = loadUsingLaserScanner();
  useLaserScannerKeystrokeInput();
  const nav = useNavigate();

  const [scanner, setScanner] = useState<
    "strich" | "react-qr-reader" | "scandit"
    // @ts-expect-error this is temporary code so doesn't need to type-check
  >(localStorage.getItem("preferred-scanner") ?? "scandit");

  type Option = {
    id: "strich" | "react-qr-reader" | "scandit";
    label: string;
  };

  const onChange = useCallback(
    (option: SingleValue<Option>) => {
      if (option) {
        setScanner(option.id);
        localStorage.setItem("preferred-scanner", option.id);
      }
    },
    [setScanner]
  );

  const options: Option[] = [
    { id: "scandit", label: "Scandit" },
    { id: "strich", label: "Strich" },
    { id: "react-qr-reader", label: "React-QR-Reader" }
  ];

  const onResult = useCallback(
    (result: string): void => {
      console.log(`Got result, considering redirect`, result);
      const newLoc = maybeRedirect(result);
      if (newLoc) {
        // Instantly remove any error toasts
        toast.remove();
        nav(newLoc);
      } else {
        toast.error(
          "The QR code you scanned is not a Zupass QR code. Make sure the QR code you're scanning comes from the Zupass app.",
          { id: "scan-error", duration: 10000, position: "bottom-center" }
        );
      }
    },
    [nav]
  );

  const onQrReaderResult = useCallback(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (result) => {
      if (result) {
        onResult(result.getText());
      }
    },
    [onResult]
  );

  return (
    <AppContainer bg="gray">
      {!usingLaserScanner && (
        <QRContainer>
          <Spacer h={8} />
          <ButtonsContainer>
            <Back />
            <Home />
          </ButtonsContainer>
          <Select
            value={options.find((option) => option.id === scanner)}
            onChange={onChange}
            options={options}
          ></Select>
          <Spacer h={16} />
          {scanner === "react-qr-reader" && (
            <QrReader
              className="qr"
              onResult={onQrReaderResult}
              constraints={{ facingMode: "environment", aspectRatio: 1 }}
              ViewFinder={ViewFinder}
              containerStyle={{ width: "100%" }}
            />
          )}
          {scanner === "scandit" && <ScanditScanner onScan={onResult} />}
          {scanner === "strich" && <StrichScanner onResult={onResult} />}
          <Spacer h={16} />
          <TextCenter>Scan a ticket</TextCenter>
        </QRContainer>
      )}
      {usingLaserScanner && (
        <>
          <FullWidthRow>
            <Spacer h={32} />
            <TextCenter>
              Press and hold down the <Orange>orange</Orange> scan button and
              position the attendee's QR code in front of the laser light. If
              you're having trouble, ask the participant to increase the
              brightness on their screen.
            </TextCenter>
            <Spacer h={16} />
            <TextCenter>
              Please reach out to the Zupass Help Desk for any further scanning
              issues.
            </TextCenter>
            {/* TODO: Add an image if we have a good one */}
          </FullWidthRow>
        </>
      )}
      <Spacer h={32} />
      <IndicateIfOffline>
        <H5 style={{ color: "var(--danger)" }}>Offline Mode</H5>
        <Spacer h={8} />
        You're offline. Zupass is using a backed up copy of event tickets.
        Check-ins will be synced the next time you start the app with a working
        network connection.
      </IndicateIfOffline>
    </AppContainer>
  );
}

function ViewFinder(): JSX.Element {
  return (
    <ScanOverlayWrap>
      <Guidebox>
        <Corner top left />
        <Corner top />
        <Corner left />
        <Corner />
      </Guidebox>
    </ScanOverlayWrap>
  );
}

const Orange = styled.span`
  font-weight: bold;
  color: orange;
`;

const ScanOverlayWrap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 1;
  margin: 16px;
`;

const FullWidthRow = styled.div`
  width: 100%;
`;

const Guidebox = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 75%;
  height: 75%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const Corner = styled.div<{ top?: boolean; left?: boolean }>`
  position: absolute;
  ${(p): string => (p.top ? "top: 0" : "bottom: 0")};
  ${(p): string => (p.left ? "left: 0" : "right: 0")};
  border: 2px solid white;
  ${(p): string => (p.left ? "border-right: none" : "border-left: none")};
  ${(p): string => (p.top ? "border-bottom: none" : "border-top: none")};
  width: 16px;
  height: 16px;
  ${(p): string => (p.left && p.top ? "border-radius: 8px 0 0 0;" : "")};
  ${(p): string => (p.left && !p.top ? "border-radius: 0 0 0 8px;" : "")};
  ${(p): string => (!p.left && p.top ? "border-radius: 0 8px 0 0;" : "")};
  ${(p): string => (!p.left && !p.top ? "border-radius: 0 0 8px 0;" : "")};
`;

const QRContainer = styled.div`
  width: 100%;
`;
