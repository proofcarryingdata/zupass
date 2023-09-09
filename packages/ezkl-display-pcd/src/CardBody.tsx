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
import GifQR from "./GifQR";

export function EzklDisplayCardBody({ pcd }: { pcd: EzklDisplayPCD }) {
  // const ticketData = getTicketData(pcd);

  const [groupPCD, setGroupPCD] = useState<EzklGroupPCD | null>(null);

  useEffect(() => {
    const callProve = async () => {
      const serializedDisplayPCD = await EzklDisplayPCDPackage.serialize(pcd);

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

  // const arrProof = stringToUint8ClampedArray(groupPCD?.proof?.proof);
  console.log("groupPCD");
  return (
    <Container>
      <h1>hello this is a display</h1>
      {/* {groupPCD && <TicketQR pcd={groupPCD} />} */}
      {groupPCD && (
        // <div style={{ overflowWrap: "break-word" }}>{groupPCD.proof.proof}</div>
        <GifQR proof={groupPCD.proof.proof.toString()} />
      )}
      {/* <TicketInfo>
        <span>{ticketData.attendeeName}</span>
        <span>{ticketData.attendeeEmail}</span>
      </TicketInfo> */}
    </Container>
  );
}

// function TicketQR({ pcd }: { pcd: EzklGroupPCD }) {
//   const generate = useCallback(async () => {
//     const serialized = await EzklGroupPCDPackage.serialize(pcd);
//     const serializedPCD = JSON.stringify(serialized);
//     const encodedPCD = encodeQRPayload(serializedPCD);
//     console.log("ENCODED PCD", encodedPCD);
//     const link = `${window.location.origin}#/verify?pcd=${encodeURIComponent(
//       encodedPCD
//     )}`;
//     console.log("link", link);
//     return link;
//     // return "https://www.google.com";
//     if (!initArgs.makeEncodedVerifyLink) {
//       throw new Error("must provide makeEncodedVerifyLink");
//     }
//     const verificationLink = initArgs.makeEncodedVerifyLink(encodedPCD);
//     return verificationLink;
//   }, [pcd]);

//   return (
//     <QRDisplayWithRegenerateAndStorage
//       generateQRPayload={generate}
//       maxAgeMs={1000 * 60}
//       uniqueId={pcd.id}
//       fgColor="red"
//       // fgColor={getQRCodeColorOverride(pcd)}
//     />
//   );
// }

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
