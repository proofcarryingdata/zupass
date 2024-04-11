import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd/EdDSATicketPCD";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import {
  openZupassPopup,
  useZupassPopupMessages
} from "@pcd/passport-interface/PassportPopup";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";
import { useEffect, useState } from "react";
import "./App.css";

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
function openZKEdDSAEventTicketPopup(
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  validEventIds: string[],
  validProductIds: string[]
) {
  // These arguments determine the options that will be passed in to the ZK
  // proving screen. Where `userProvided` is true, the user must input or
  // select an option.
  // This particular proof will be a proof about an EdDSA ticket that the user
  // owns, and so the options relate to the selection of the ticket and the
  // claim that the user will make about it.
  const args: ZKEdDSAEventTicketPCDArgs = {
    // This allows the user to choose a ticket to make a proof about.
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDTypeName,
      value: undefined,
      userProvided: true,
      validatorParams: {
        // It is possible to filter the tickets the user can choose from by
        // event ID and product ID. Empty arrays mean that no filtering will
        // occur.
        eventIds: validEventIds,
        productIds: validProductIds,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    // This is the user's Semaphore identity, which is required in order to
    // prove that the user controls the identity that the ticket was created
    // for.
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName,
      value: undefined,
      userProvided: true
    },
    // If we want the proof to show that the ticket belongs to a certain event
    // or set of events, the event IDs can be passed in here.
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length != 0 ? validEventIds : undefined,
      userProvided: false
    },
    // The fields to reveal in the claim.
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    // The watermark can be used to ensure that the proof is used only once.
    // This can be done by, for example, generating a random number, passing
    // it in as the watermark, and then checking that the proof contains a
    // matching watermark.
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    },
    // The external nullifier is an input into the nullifier hash, which is a
    // function of the user's identity and the external nullifier. The
    // nullifier hash can be used to determine that two proofs with identical
    // nullifier hashes where produced by the same user, without revealing the
    // user's identity (provided that the external nullifier is the same in
    // both cases).
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: "12345",
      userProvided: false
    }
  };

  const popupUrl = window.location.origin + "/popup";
  const ZUPASS_PRODUCTION_URL = "https://zupass.org";

  // Create the Zupass URL which will be loaded in the popup window.
  const proofUrl = constructZupassPcdGetRequestUrl(
    import.meta.env.ZUPASS_SERVER_URL ?? ZUPASS_PRODUCTION_URL,
    popupUrl,
    ZKEdDSAEventTicketPCDTypeName,
    args,
    {
      genericProveScreen: true,
      title: "ZKEdDSA Ticket Proof",
      description: "ZKEdDSA Ticket PCD Request"
    }
  );

  // Open the popup window. This points /popup on the local site, with the
  // Zupass URL as a query parameter. In `popup.tsx` we do a redirect to the
  // Zupass URL.
  openZupassPopup(popupUrl, proofUrl);
}

function App() {
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
        // In a real-world application, you might send this serialized PCD to
        // a back-end service for verification. It can also be verified in the
        // browser, though this would require importing the relevant PCDPackage
        // and its dependencies, which can be large (>2MB of JavaScript/Wasm).
        setResult(pcdStr);
      }
    })();
  }, [pcdStr]);

  return (
    <main className="root">
      <div className="">
        <button onClick={openPopup}>Click me</button>
        <div>{result}</div>
      </div>
    </main>
  );
}

export default App;
