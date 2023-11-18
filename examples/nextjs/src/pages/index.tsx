import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructZupassPcdGetRequestUrl,
  openZupassPopup,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
function openZKEdDSAEventTicketPopup(
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  validEventIds: string[],
  validProductIds: string[]
) {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: validEventIds,
        productIds: validProductIds,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length != 0 ? validEventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: "12345",
      userProvided: false
    }
  };

  const popupUrl = window.location.origin + "/popup";
  const ZUPASS_URL = "https://zupass.org";

  const proofUrl = constructZupassPcdGetRequestUrl(
    ZUPASS_URL,
    popupUrl,
    ZKEdDSAEventTicketPCDPackage.name,
    args,
    {
      genericProveScreen: true,
      title: "ZKEdDSA Ticket Proof",
      description: "ZKEdDSA Ticket PCD Request"
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}

export default function Home() {
  const openPopup = () => {
    openZKEdDSAEventTicketPopup(
      { revealAttendeeEmail: true },
      BigInt(0),
      [],
      []
    );
  };

  const [pcdStr] = useZupassPopupMessages();
  const [result, setResult] = useState("");

  useEffect(() => {
    (async () => {
      if (pcdStr) {
        console.log(pcdStr);
        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(pcdStr).pcd
        );

        if (pcd && (await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
          setResult(
            `Your email address is ${pcd.claim.partialTicket.attendeeEmail}`
          );
        } else {
          setResult("Could not verify PCD");
        }
      }
    })();
  }, [pcdStr]);

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <div className="z-10 max-w-5xl w-full text-sm">
        <button onClick={openPopup}>Click me</button>
        <div>{result}</div>
      </div>
    </main>
  );
}
