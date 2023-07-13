import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { createQRProof } from "../../src/createQRProof";
import { DispatchContext } from "../../src/dispatch";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { icons } from "../icons";
import { QR } from "./QR";

interface SavedQRState {
  timestamp: number;
  payload: string;
}

const [qrBg, qrFg] = (() => {
  try {
    const style = getComputedStyle(document.body);
    const bg = style.getPropertyValue("--white");
    const fg = style.getPropertyValue("--bg-dark-primary");
    return [bg, fg];
  } catch (e) {
    return ["white", "black"];
  }
})();

/**
 * Generate a fresh identity-revealing proof every n ms. We regenerate before
 * the proof expires to allow for a few minutes of clock skew between prover
 * and verifier.
 */
const regenerateAfterMs = (appConfig.maxIdentityProofAgeMs * 2) / 3;

export function IdentityQR() {
  const [state] = useContext(DispatchContext);
  const { identity, self } = state;
  const { uuid } = self;

  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const pcd = await createQRProof(identity, uuid, Date.now());
    const serialized = await SemaphoreSignaturePCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    console.log(`[QR] generated proof, length ${serializedPCD.length}`);
    const encodedPCD = encodeQRPayload(serializedPCD);
    const verifyLink = makeEncodedVerifyLink(encodedPCD);
    return verifyLink;
  }, [identity, uuid]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      loadingLogo={<QRLogoLoading />}
      loadedLogo={appConfig.isZuzalu ? <QRLogoDone /> : undefined}
      maxAgeMs={appConfig.maxIdentityProofAgeMs}
      fgColor={qrFg}
      bgColor={qrBg}
      uniqueId={"IDENTITY_ID"}
    />
  );
}

export function QRDisplayWithRegenerateAndStorage({
  generateQRPayload,
  maxAgeMs,
  uniqueId,
  loadingLogo,
  loadedLogo,
  fgColor,
  bgColor,
}: {
  generateQRPayload: () => Promise<string>;
  maxAgeMs: number;
  uniqueId: string;
  loadingLogo: React.ReactNode;
  loadedLogo: React.ReactNode;
  fgColor?: string;
  bgColor?: string;
}) {
  const [savedState, setSavedState] = useState<SavedQRState | undefined>(() => {
    const savedState = JSON.parse(
      localStorage[uniqueId] || "{}"
    ) as Partial<SavedQRState>;
    console.log(
      `[QR] loaded saved state for ${uniqueId}: ${JSON.stringify(savedState)}`
    );

    const { timestamp, payload } = savedState;

    if (
      timestamp != null &&
      Date.now() - timestamp < maxAgeMs &&
      payload !== undefined
    ) {
      console.log(`[QR] from localStorage, timestamp ${timestamp}`);
      return { timestamp, payload: payload };
    }

    return undefined;
  });

  const maybeGenerateQR = useCallback(async () => {
    const timestamp = Date.now();
    if (savedState && timestamp - savedState.timestamp < regenerateAfterMs) {
      console.log(`[QR] not regenerating, timestamp ${timestamp}`);
      return;
    }
    console.log(`[QR] regenerating data ${timestamp}`);
    const newData = await generateQRPayload();
    const newSavedState: SavedQRState = { timestamp, payload: newData };
    localStorage[uniqueId] = JSON.stringify(newSavedState);
    setSavedState(newSavedState);
  }, [generateQRPayload, savedState, uniqueId]);

  useEffect(() => {
    maybeGenerateQR();
    const interval = setInterval(maybeGenerateQR, maxAgeMs / 10);
    return () => clearInterval(interval);
  }, [maxAgeMs, maybeGenerateQR]);

  const logoOverlay = useMemo(() => {
    return savedState ? loadedLogo : loadingLogo;
  }, [loadedLogo, loadingLogo, savedState]);

  console.log(`[QR] rendering ${savedState?.payload}`);

  return (
    <QRDisplay
      logoOverlay={logoOverlay}
      value={savedState?.payload}
      fgColor={fgColor}
      bgColor={bgColor}
    />
  );
}

export function QRDisplay({
  value,
  logoOverlay,
  fgColor,
  bgColor,
}: {
  value?: string;
  logoOverlay?: React.ReactNode;
  fgColor?: string;
  bgColor?: string;
}) {
  return (
    <QRWrap>
      {value !== undefined && (
        <QR
          value={value}
          bgColor={fgColor ?? "black"}
          fgColor={bgColor ?? "white"}
        />
      )}
      {logoOverlay}
    </QRWrap>
  );
}

function QRLogoLoading() {
  return <QRLogo width="48" height="48" src={icons.qrCenterLoading} />;
}

function QRLogoDone() {
  return <QRLogo width="48" height="48" src={icons.qrCenter} />;
}

const QRLogo = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

// Style constants
const qrSize = "300px";
const QRWrap = styled.div`
  position: relative;
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
