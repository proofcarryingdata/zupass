import { icons } from "@pcd/passport-ui";
import { useCallback } from "react";
import { QrReader } from "react-qr-reader";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useLaserScannerKeystrokeInput } from "../../src/appHooks";
import { loadUsingLaserScanner } from "../../src/localstorage";
import { maybeRedirect } from "../../src/util";
import { H5, Spacer, TextCenter } from "../core";
import { CircleButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";
import { IndicateIfOffline } from "../shared/IndicateIfOffline";

// Scan a PCD QR code, then go to /verify to verify and display the proof.
export function ScanScreen(): JSX.Element {
  const usingLaserScanner = loadUsingLaserScanner();
  useLaserScannerKeystrokeInput();
  const nav = useNavigate();

  return (
    <AppContainer bg="gray">
      {!usingLaserScanner && (
        <>
          <QrReader
            onResult={(result, error): void => {
              if (result != null) {
                console.log(
                  `Got result, considering redirect`,
                  result.getText()
                );
                const newLoc = maybeRedirect(result.getText());
                if (newLoc) nav(newLoc);
              } else if (error != null) {
                //    console.info(error);
              }
            }}
            constraints={{ facingMode: "environment", aspectRatio: 1 }}
            ViewFinder={ViewFinder}
            containerStyle={{ width: "100%" }}
          />
          <Spacer h={16} />
          <TextCenter>Scan a ticket to verify</TextCenter>
        </>
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

function CloseButton(): JSX.Element {
  const nav = useNavigate();
  const onClose = useCallback(() => nav("/"), [nav]);
  return (
    <CircleButton diameter={20} padding={16} onClick={onClose}>
      <img draggable="false" src={icons.closeWhite} width={20} height={20} />
    </CircleButton>
  );
}

function ViewFinder(): JSX.Element {
  return (
    <ScanOverlayWrap>
      <CloseButton />
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
