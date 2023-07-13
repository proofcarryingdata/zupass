import { QRDisplayWithRegenerateAndStorage } from "@pcd/passport-ui";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useContext } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { createQRProof } from "../../src/createQRProof";
import { DispatchContext } from "../../src/dispatch";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { icons } from "../icons";

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
