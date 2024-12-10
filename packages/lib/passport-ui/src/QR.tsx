import { gzip, ungzip } from "pako";
import * as QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { FlattenSimpleInterpolation, css } from "./StyledWrapper";

export function encodeQRPayload(unencoded: string): string {
  console.log(`encoding payload with length ${unencoded.length}`);
  const compressedData = gzip(unencoded);
  const base64CompressedData = Buffer.from(compressedData).toString("base64");
  console.log(
    `Compressed: ${compressedData.length}, base64: ${base64CompressedData.length}`
  );

  return base64CompressedData;
}

export function decodeQRPayload(encoded: string): string {
  const buffer = Buffer.from(encoded, "base64");
  const unzippedBuffer = Buffer.from(ungzip(buffer));
  const decodedBuffer = unzippedBuffer.toString("utf8");
  return decodedBuffer;
}

interface SavedQRState {
  timestamp: number;
  payload: string;
}

export function QRDisplayWithRegenerateAndStorage({
  generateQRPayload,
  maxAgeMs,
  uniqueId,
  loadingLogo,
  loadedLogo,
  fgColor,
  bgColor
}: {
  generateQRPayload: () => Promise<string>;
  maxAgeMs: number;
  uniqueId?: string;
  loadingLogo?: React.ReactNode;
  loadedLogo?: React.ReactNode;
  fgColor?: string;
  bgColor?: string;
}): JSX.Element {
  /**
   * Generate a fresh identity-revealing proof every n ms. We regenerate before
   * the proof expires to allow for a few minutes of clock skew between prover
   * and verifier.
   */
  const regenerateAfterMs = (maxAgeMs * 2) / 3;

  const [savedState, setSavedState] = useState<SavedQRState | undefined>(() => {
    const savedState = uniqueId
      ? (JSON.parse(localStorage[uniqueId] || "{}") as Partial<SavedQRState>)
      : {};

    const { timestamp, payload } = savedState;

    if (
      timestamp &&
      Date.now() - timestamp < maxAgeMs &&
      payload !== undefined
    ) {
      return { timestamp, payload: payload };
    }

    return undefined;
  });

  const maybeGenerateQR = useCallback(async () => {
    const timestamp = Date.now();
    if (savedState && timestamp - savedState.timestamp < regenerateAfterMs) {
      return;
    }
    const newData = await generateQRPayload();
    const newSavedState: SavedQRState = { timestamp, payload: newData };
    if (uniqueId) {
      localStorage[uniqueId] = JSON.stringify(newSavedState);
    }
    setSavedState(newSavedState);
  }, [generateQRPayload, regenerateAfterMs, savedState, uniqueId]);

  useEffect(() => {
    maybeGenerateQR();
    const interval = setInterval(maybeGenerateQR, maxAgeMs / 10);
    return () => clearInterval(interval);
  }, [maxAgeMs, maybeGenerateQR, savedState]);

  const logoOverlay = useMemo(() => {
    return savedState ? loadedLogo : loadingLogo;
  }, [loadedLogo, loadingLogo, savedState]);

  useEffect(() => {
    console.log("[QR] rendering ", savedState);
  }, [savedState, savedState?.payload]);

  return (
    <QRDisplay
      logoOverlay={logoOverlay}
      value={savedState?.payload}
      fgColor={fgColor}
      bgColor={bgColor}
      saved={!!savedState}
    />
  );
}

export function QRDisplay({
  value,
  logoOverlay,
  fgColor,
  bgColor,
  saved
}: {
  value?: string;
  logoOverlay?: React.ReactNode;
  fgColor?: string;
  bgColor?: string;
  saved: boolean;
}): JSX.Element {
  return (
    <QRWrap saved={saved}>
      {value !== undefined && (
        <QR
          value={value}
          bgColor={bgColor ?? "#ffffff"}
          fgColor={fgColor ?? "#000000"}
        />
      )}
      {logoOverlay}
    </QRWrap>
  );
}

// Style constants
const QRWrap = styled.div<{ saved: boolean }>`
  ${({ saved }): FlattenSimpleInterpolation => (saved ? css`` : css``)}
  height: 0;
  padding-bottom: 100%;
  position: relative;
  margin: 0 auto;
  width: 100%;
`;

export function QR({
  value,
  fgColor,
  bgColor
}: {
  value: string;
  fgColor: string;
  bgColor: string;
}): JSX.Element {
  const [dataURL, setDataURL] = useState<string | undefined>();

  useEffect(() => {
    const generateQR = async (): Promise<void> => {
      const dataUrl = await QRCode.toDataURL(value, {
        type: "image/webp",
        scale: 10,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });
      setDataURL(dataUrl);
    };
    generateQR();
  }, [bgColor, fgColor, value]);

  return (
    <Container>
      <img src={dataURL} />
    </Container>
  );
}

const Container = styled.div`
  width: 100% !important;
  height: 100% !important;

  img {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`;
