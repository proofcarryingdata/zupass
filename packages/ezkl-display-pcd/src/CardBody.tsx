import {
  encodeQRPayload,
  QRDisplayWithRegenerateAndStorage
} from "@pcd/passport-ui";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
  initArgs,
  EzklDisplayPCD,
  EzklDisplayPCDPackage
} from "./EzklDisplayPCD";
// import { getQRCodeColorOverride, getTicketData } from "./utils";
import { EzklGroupPCD, EzklGroupPCDPackage } from "@pcd/ezkl-group-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";

export function EzklDisplayCardBody({ pcd }: { pcd: EzklDisplayPCD }) {
  // const ticketData = getTicketData(pcd);

  const [groupPCD, setGroupPCD] = useState<EzklGroupPCD | null>(null);

  useEffect(() => {
    const callProve = async () => {
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      console.log("===");
      const serializedDisplayPCD = await EzklDisplayPCDPackage.serialize(pcd);
      // console.log("serializedGroupArgs", serializedGroupArgs);

      const groupPCD = await EzklGroupPCDPackage.prove({
        displayPCD: {
          argumentType: ArgumentTypeName.PCD,
          value: serializedDisplayPCD
        }
      });

      setGroupPCD(groupPCD);
    };

    callProve();
  }, [pcd]);

  return (
    <Container>
      <h1>hello this is a display</h1>
      {groupPCD && <TicketQR pcd={groupPCD} />}
      {/* <TicketInfo>
        <span>{ticketData.attendeeName}</span>
        <span>{ticketData.attendeeEmail}</span>
      </TicketInfo> */}
    </Container>
  );
}

function TicketQR({ pcd }: { pcd: EzklGroupPCD }) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const serialized = await EzklGroupPCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    console.log(`[QR] generated proof, length ${serializedPCD.length}`);
    const encodedPCD = encodeQRPayload(serializedPCD);
    return "https://www.google.com";
    if (!initArgs.makeEncodedVerifyLink) {
      throw new Error("must provide makeEncodedVerifyLink");
    }
    const verificationLink = initArgs.makeEncodedVerifyLink(encodedPCD);
    return verificationLink;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
      fgColor="red"
      // fgColor={getQRCodeColorOverride(pcd)}
    />
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

// const TicketInfo = styled.div`
//   margin-top: 8px;
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   flex-direction: column;
// `;
