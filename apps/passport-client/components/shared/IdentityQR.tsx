import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { createQRProof } from "../../src/createQRProof";
import { DispatchContext } from "../../src/dispatch";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { icons } from "../icons";
import { QR } from "./QR";

interface QRPayload {
  timestamp: number;
  qrPCD: string;
}

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

  const [qrPayload, setQRPayload] = useState<QRPayload>(() => {
    const { timestamp, qrPCD } = JSON.parse(localStorage["zuzaluQR"] || "{}");
    if (
      timestamp != null &&
      Date.now() - timestamp < appConfig.maxIdentityProofAgeMs
    ) {
      console.log(`[QR] from localStorage, timestamp ${timestamp}`);
      return { timestamp, qrPCD };
    }
  });

  const maybeGenerateQR = useCallback(
    async function () {
      const timestamp = Date.now();
      if (qrPayload && timestamp - qrPayload.timestamp < regenerateAfterMs) {
        console.log(`[QR] not regenerating, timestamp ${timestamp}`);
        return;
      }

      console.log(`[QR] generating proof, timestamp ${timestamp}`);
      const pcd = await createQRProof(identity, uuid, timestamp);
      const serialized = await SemaphoreSignaturePCDPackage.serialize(pcd);
      const stringified = JSON.stringify(serialized);
      console.log(`[QR] generated proof, length ${stringified.length}`);

      const qrPCD = encodeQRPayload(stringified);
      localStorage["zuzaluQR"] = JSON.stringify({ timestamp, qrPCD });
      setQRPayload({ timestamp, qrPCD });
    },
    [identity, qrPayload, uuid]
  );

  // Load or generate QR code on mount, then regenerate periodically
  useEffect(() => {
    maybeGenerateQR();
    const interval = setInterval(
      maybeGenerateQR,
      appConfig.maxIdentityProofAgeMs / 10
    );
    return () => clearInterval(interval);
  }, [maybeGenerateQR]);

  if (qrPayload == null) {
    return (
      <QRWrap>
        <QRLogoLoading />
      </QRWrap>
    );
  }

  const qrLink = makeEncodedVerifyLink(qrPayload.qrPCD);
  console.log(`Link, ${qrLink.length} bytes: ${qrLink}`);

  return (
    <QRWrap>
      <QR value={qrLink} bgColor={qrBg} fgColor={qrFg} />
      {appConfig.isZuzalu && <QRLogoDone />}
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
const [qrBg, qrFg] = (() => {
  const style = getComputedStyle(document.body);
  const bg = style.getPropertyValue("--white");
  const fg = style.getPropertyValue("--bg-dark-primary");
  return [bg, fg];
})();

const QRWrap = styled.div`
  position: relative;
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
