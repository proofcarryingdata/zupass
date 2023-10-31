import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { HomeLink } from "../../../components/Core";
import { ExampleContainer } from "../../../components/ExamplePage";
import ZuAuthButton from "./ZuAuthButton";
import { isAuthenticated } from "./utils";

/**
 * This React component serves as an example of the ZuAuthButton integration,
 * supporting both anonymous and non-anonymous authentication flows making
 * proofs on top of ZK EdDSA Ticket Event PCD.
 */
export default function ZuAuthExample() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  const [fieldsToReveal, setFieldsToReveal] = useState<EdDSATicketFieldsToReveal>({
    revealTicketId: false,
    revealEventId: false,
    revealProductId: false,
    revealTimestampConsumed: false,
    revealTimestampSigned: false,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false,
    revealTicketCategory: false,
    revealAttendeeEmail: false,
    revealAttendeeName: false
  });

  // If they are empty, all events and products identifiers are valid.
  const exampleValidTicketsIds: string[] = [];
  const exampleValidProductIds: string[] = [];

  useEffect(() => {
    (async function () {
      setAuthenticated(await isAuthenticated());

      const savedFields = JSON.parse(localStorage.getItem('fieldsToReveal'));
      if (savedFields) {
        setFieldsToReveal(savedFields);
      }
    })();
  }, []);

  function toggleFieldToReveal(fieldName: string) {
    setFieldsToReveal((prevState: EdDSATicketFieldsToReveal) => {
      const revealedFields = {
        ...prevState,
        [fieldName]: !prevState[fieldName]
      };

      localStorage.setItem('fieldsToReveal', JSON.stringify(revealedFields));

      return revealedFields;
    });
  };

  return (
    <div>
      <HomeLink />
      <>
        <h2> Authentication with a ZK EdDSA Event Ticket PCD</h2>
        <p>
          An example of authentication using by making a proof on
          ZK EdDSA Event Ticket PCD revealing a subset of the ticket fields.
        </p>
      </>

      <ExampleContainer>
        <ZuAuthButton
          ticketFieldsToReveal={fieldsToReveal}
          validEventIds={exampleValidTicketsIds}
          validProductIds={exampleValidProductIds}
          authenticated={authenticated}
          setAuthenticated={setAuthenticated}
        />

        <div>
          {Object.keys(fieldsToReveal).map((fieldName, index) => (
            <div key={index}>
              <label>
                <input
                  type="checkbox"
                  checked={fieldsToReveal[fieldName]}
                  onChange={() => toggleFieldToReveal(fieldName)}
                />
                {fieldName}
              </label>
            </div>
          ))}
        </div>

      </ExampleContainer>
      {/** @todo show revealed fields here */}
      <p>{authenticated ? "✅ Authenticated" : "✖️ Not authenticated"} {``}</p>
    </div>
  );
}
