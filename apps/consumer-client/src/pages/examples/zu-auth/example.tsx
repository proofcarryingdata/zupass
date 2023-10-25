import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { HomeLink } from "../../../components/Core";
import { ExampleContainer } from "../../../components/ExamplePage";
import ZuAuthButton from "./ZuAuthButton";
import { isAuthenticated } from "./utils";

/**
 * This React component serves as an example of the ZuAuthButton integration,
 * supporting both anonymous and non-anonymous authentication flows.
 */
export default function ZuAuthExample() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [anonymous, setAnonymous] = useState<boolean>(
    JSON.parse(localStorage.getItem("anonymous"))
  );

  const exampleTicketFieldsToReveal: EdDSATicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true,
    revealTicketId: true,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false,
    revealTicketCategory: false,
    revealTimestampConsumed: false,
    revealTimestampSigned: false
  };

  // If they are empty, all events and products identifiers are valid.
  const exampleValidTicketsIds: string[] = [];
  const exampleValidProductIds: string[] = [];

  useEffect(() => {
    (async function () {
      setAuthenticated(await isAuthenticated());
    })();
  }, []);

  return (
    <div>
      <HomeLink />

      {anonymous ? (
        <>
          <h2>Anonymous authentication with a ZK EdDSA Event Ticket PCD</h2>
          <p>
            An example of authentication using by making a proof on 
            ZK EdDSA Event Ticket PCD.
          </p>
        </>
      ) : (
        <>
          <h2>Authentication with an EdDSA Ticket PCD</h2>
          <p>
            An example of authentication by signing an EdDSA Event
            Ticket PCD through a Semaphore Signature PCD
          </p>
        </>
      )}

      <ExampleContainer>
        <ZuAuthButton
          ticketFieldsToReveal={exampleTicketFieldsToReveal}
          validEventIds={exampleValidTicketsIds}
          validProductIds={exampleValidProductIds}
          useAnonAuthentication={anonymous}
          authenticated={authenticated}
          setAuthenticated={setAuthenticated}
        />

        <input
          type="checkbox"
          checked={anonymous}
          onChange={() => {
            setAnonymous((anonymous) => !anonymous);
            localStorage.setItem("anonymous", JSON.stringify(!anonymous));
          }}
          disabled={authenticated}
        />
        <label>ZK mode 🕶</label>
      </ExampleContainer>

      <p>{authenticated ? "✅ Authenticated" : ""}</p>
    </div>
  );
}
