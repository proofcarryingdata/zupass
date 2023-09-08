import {
  encodeQRPayload,
  QRDisplayWithRegenerateAndStorage
} from "@pcd/passport-ui";
import { useCallback, useEffect } from "react";
import styled from "styled-components";
import {
  initArgs,
  EzklDisplayPCD,
  EzklDisplayPCDPackage
} from "./EzklDisplayPCD";
// import { getQRCodeColorOverride, getTicketData } from "./utils";
import { EzklGroupPCDPackage } from "@pcd/ezkl-group-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";

export function EzklDisplayCardBody({ pcd }: { pcd: EzklDisplayPCD }) {
  // const ticketData = getTicketData(pcd);

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

      const groupProof = await EzklGroupPCDPackage.prove({
        displayPCD: {
          argumentType: ArgumentTypeName.PCD,
          value: serializedDisplayPCD
        }
      });

      //   {
      //   displayPCD: {
      //     argumentType: ArgumentTypeName.PCD,
      //     value: pcd,
      //     userProvided: false
      //   }
      // };
      // const groupProof = await EzklGroupPCDPackage.prove();
      // console.log("groupProof", groupProof);
    };

    callProve();
  }, [pcd]);

  return (
    <Container>
      <h1>hello this is a display</h1>
      <TicketQR pcd={pcd} />

      {/* <TicketInfo>
        <span>{ticketData.attendeeName}</span>
        <span>{ticketData.attendeeEmail}</span>
      </TicketInfo> */}
    </Container>
  );
}

function TicketQR({ pcd }: { pcd: EzklDisplayPCD }) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const serialized = await EzklDisplayPCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    console.log(`[QR] generated proof, length ${serializedPCD.length}`);
    const encodedPCD = encodeQRPayload(serializedPCD);
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
