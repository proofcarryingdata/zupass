import { ZuParticipant } from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { config } from "../../src/config";
import { createZuzaluQRProof } from "../../src/createZuzaluQRProof";
import { DispatchContext } from "../../src/dispatch";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { H3, InfoLine, Spacer, TextCenter } from "../core";
import { icons } from "../icons";
import { QR } from "./QR";

export function ZuzaluCardBody({
  showQrCode,
  participant,
}: {
  showQrCode?: boolean;
  participant?: ZuParticipant;
}) {
  const [state, _] = useContext(DispatchContext);
  const { role, name, email, residence } = participant ?? state.self;

  return (
    <CardBody>
      {showQrCode && (
        <>
          <Spacer h={32} />
          <ZuzaluQR />
        </>
      )}
      <Spacer h={24} />
      <TextCenter>
        <H3 col="var(--primary-dark)">{name}</H3>
        <InfoLine>{email}</InfoLine>
        <InfoLine>{residence}</InfoLine>
      </TextCenter>
      <Spacer h={24} />
      <Footer role={role}>ZUZALU {role.toUpperCase()}</Footer>
    </CardBody>
  );
}

const CardBody = styled.div`
  background: var(--white);
  color: var(--primary-dark);
  border-radius: 0 0 12px 12px;
`;

const Footer = styled.div<{ role: string }>`
  font-size: 20px;
  letter-spacing: 1px;
  background: ${(p) =>
    highlight(p.role) ? "var(--accent-lite)" : "var(--primary-dark)"};
  color: ${(p) => (highlight(p.role) ? "var(--primary-dark)" : "var(--white)")};
  /* Must be slightly lower than the card's border-radius to nest correctly. */
  border-radius: 0 0 10px 10px;
  padding: 8px;
  text-align: center;
`;

function highlight(role: string) {
  return role === "resident" || role === "organizer";
}

/**
 * Generate a fresh Zuzalu identity-revealing proof every n ms.
 * We regenerate before the proof expires to allow for a few minutes of
 * clock skew between prover and verifier.
 */
const regenerateAfterMs = (config.maxProofAge * 2) / 3;

function ZuzaluQR() {
  const [state] = useContext(DispatchContext);
  const { identity, self } = state;
  const { uuid } = self;

  const [qrPayload, setQRPayload] = useState<string | undefined>();
  const keepRegenerating = useRef<boolean>(true);

  const generateQr = useCallback(
    async function () {
      if (!keepRegenerating.current) return;
      const timestamp = Date.now();
      console.log(`generating zuzalu QR proof, timestamp ${timestamp}`);
      const pcd = await createZuzaluQRProof(identity, uuid, timestamp);
      const serialized = await SemaphoreSignaturePCDPackage.serialize(pcd);
      const stringified = JSON.stringify(serialized);
      console.log(`generated zuzalu QR proof, length ${stringified.length}`);

      const qrPCD = encodeQRPayload(stringified);
      localStorage["zuzaluQR"] = JSON.stringify({ timestamp, qrPCD });
      setQRPayload(qrPCD);

      if (!keepRegenerating.current) return;
      window.setTimeout(generateQr, regenerateAfterMs);
    },
    [identity, uuid]
  );

  // Load or generate QR code on mount, then regenerate periodically
  useEffect(() => {
    const { timestamp, qrPCD } = JSON.parse(localStorage["zuzaluQR"] || "{}");
    let startInMs = 0;
    if (timestamp != null && Date.now() - timestamp < config.maxProofAge) {
      setQRPayload(qrPCD);
      startInMs = Math.max(0, regenerateAfterMs - (Date.now() - timestamp));
      console.log(`Loaded QR from storage. Regenerating in ${startInMs}ms`);
    }
    setTimeout(generateQr, startInMs);
    return () => {
      keepRegenerating.current = false;
    };
  }, [generateQr]);

  if (qrPayload == null) {
    return (
      <QRWrap>
        <QRLogoLoading />
      </QRWrap>
    );
  }

  const qrLink = makeEncodedVerifyLink(qrPayload);
  console.log(`Link, ${qrLink.length} bytes: ${qrLink}`);

  return (
    <QRWrap>
      {/* <QRCode  value={qrLink} style={qrStyle} /> */}
      <QR value={qrLink} bgColor={qrBg} fgColor={qrFg} />
      <QRLogoDone />
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
