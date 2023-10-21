import { useCallback } from "react";
import { QrReader } from "react-qr-reader";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { H5, Spacer, TextCenter } from "../core";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import { IndicateIfOffline } from "../shared/OfflineModeIndicator";

// Scan a PCD QR code, then go to /verify to verify and display the proof.
export function ScanScreen() {
  const nav = useNavigate();
  return (
    <AppContainer bg="gray">
      <QrReader
        onResult={(result, error) => {
          if (result != null) {
            console.log(`Got result, considering redirect`, result.getText());
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

function maybeRedirect(text: string): string | null {
  const verifyUrlPrefixes = [
    `${window.location.origin}/#/verify`,
    `${window.location.origin}#/verify`,
    `${window.location.origin}/#/checkin`,
    `${window.location.origin}#/checkin`,
    `${window.location.origin}/#/checkin-by-id`,
    `${window.location.origin}#/checkin-by-id`
  ];
  if (verifyUrlPrefixes.find((prefix) => text.startsWith(prefix))) {
    const hash = text.substring(text.indexOf("#") + 1);
    console.log(`Redirecting to ${hash}`);
    return hash;
  }
  return null;
}

function ViewFinder() {
  const nav = useNavigate();
  const onClose = useCallback(() => nav("/"), [nav]);

  return (
    <ScanOverlayWrap>
      <CircleButton diameter={20} padding={16} onClick={onClose}>
        <img draggable="false" src={icons.closeWhite} width={20} height={20} />
      </CircleButton>
      <Guidebox>
        <Corner top left />
        <Corner top />
        <Corner left />
        <Corner />
      </Guidebox>
    </ScanOverlayWrap>
  );
}

const ScanOverlayWrap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 1;
  margin: 16px;
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
  ${(p) => (p.top ? "top: 0" : "bottom: 0")};
  ${(p) => (p.left ? "left: 0" : "right: 0")};
  border: 2px solid white;
  ${(p) => (p.left ? "border-right: none" : "border-left: none")};
  ${(p) => (p.top ? "border-bottom: none" : "border-top: none")};
  width: 16px;
  height: 16px;
  ${(p) => (p.left && p.top ? "border-radius: 8px 0 0 0;" : "")};
  ${(p) => (p.left && !p.top ? "border-radius: 0 0 0 8px;" : "")};
  ${(p) => (!p.left && p.top ? "border-radius: 0 8px 0 0;" : "")};
  ${(p) => (!p.left && !p.top ? "border-radius: 0 0 8px 0;" : "")};
`;
