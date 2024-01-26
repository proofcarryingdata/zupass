import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructZupassPcdGetRequestUrl,
  openZupassPopup,
  useSerializedPCD,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useMemo, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL } from "../../constants";

export default function Page(): JSX.Element {
  const watermark = generateSnarkMessageHash(
    "consumer-client zk-eddsa-event-ticket-pcd challenge"
  );
  const externalNullifier =
    generateSnarkMessageHash("consumer-client").toString();

  const [revealTicketId, setRevealTicketId] = useState(false);
  const [revealEventId, setRevealEventId] = useState(true);
  const [revealProductId, setRevealProductId] = useState(true);
  const [revealTimestampConsumed, setRevealTimestampConsumed] = useState(false);
  const [revealTimestampSigned, setRevealTimestampSigned] = useState(false);
  const [revealAttendeeSemaphoreId, setRevealAttendeeSemaphoreId] =
    useState(false);
  const [revealIsConsumed, setRevealIsConsumed] = useState(false);
  const [revealIsRevoked, setRevealIsRevoked] = useState(false);
  const [revealAttendeeEmail, setRevealAttendeeEmail] = useState(false);
  const [revealAttendeeName, setRevealAttendeeName] = useState(false);
  const [revealFieldsUserProvided, setRevealFieldsUserProvided] =
    useState(false);
  const [validEventIdsInput, setValidEventIdsInput] = useState("");
  const [validDisplayEventIdsInput, setDisplayValidEventIdsInput] =
    useState("");
  const [validDisplayProductIdsInput, setDisplayValidProductIdsInput] =
    useState("");

  const validEventIds = validEventIdsInput
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s != "");
  const displayValidEventIds = validDisplayEventIdsInput
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s != "");
  const displayValidProductIds = validDisplayProductIdsInput
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s != "");

  const fieldsToReveal: EdDSATicketFieldsToReveal = useMemo(
    () => ({
      revealTicketId,
      revealEventId,
      revealProductId,
      revealTimestampConsumed,
      revealTimestampSigned,
      revealAttendeeSemaphoreId,
      revealIsConsumed,
      revealIsRevoked,
      revealAttendeeEmail,
      revealAttendeeName
    }),
    [
      revealTicketId,
      revealEventId,
      revealProductId,
      revealTimestampConsumed,
      revealTimestampSigned,
      revealAttendeeSemaphoreId,
      revealIsConsumed,
      revealIsRevoked,
      revealAttendeeEmail,
      revealAttendeeName
    ]
  );

  // Populate PCD from either client-side or server-side proving using the Zupass popup
  const [pcdStr] = useZupassPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean): void => {
    setValid(valid);
  };

  const { pcd } = useZKEdDSAEventTicketProof(
    pcdStr,
    onVerified,
    fieldsToReveal,
    watermark,
    externalNullifier
  );

  return (
    <>
      <HomeLink />
      <h2>ZKEdDSA Event Ticket Proof</h2>
      <p>
        This page shows a working example of an integration Zupass which
        requests and verifies that the user has an EdDSA-signed ticket to one of
        a list of valid events.
      </p>
      <p>
        The underlying PCD that this example uses is{" "}
        <code>ZKEdDSAEventTicketPCD</code>. You can find more documentation
        regarding this PCD{" "}
        <CodeLink file="/tree/main/packages/zk-eddsa-event-ticket-pcd">
          here on GitHub
        </CodeLink>{" "}
        .
      </p>
      <ExampleContainer>
        <button
          onClick={(): void =>
            openZKEdDSAEventTicketPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              fieldsToReveal,
              revealFieldsUserProvided,
              watermark,
              validEventIds,
              displayValidEventIds,
              displayValidProductIds,
              externalNullifier
            )
          }
          disabled={valid}
        >
          Request Zupass Event Ticket Proof
        </button>
        <br />
        Valid event ids, comma separated (or empty for no validation):
        <textarea
          cols={45}
          rows={12}
          value={validEventIdsInput}
          onChange={(e): void => {
            setValidEventIdsInput(e.target.value);
          }}
        />
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealTicketId}
            onChange={(): void => {
              setRevealTicketId((checked) => !checked);
            }}
          />
          request ticketId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealEventId}
            onChange={(): void => {
              setRevealEventId((checked) => !checked);
            }}
          />
          request eventId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealProductId}
            onChange={(): void => {
              setRevealProductId((checked) => !checked);
            }}
          />
          request productId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealTimestampConsumed}
            onChange={(): void => {
              setRevealTimestampConsumed((checked) => !checked);
            }}
          />
          request timestampConsumed?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealTimestampSigned}
            onChange={(): void => {
              setRevealTimestampSigned((checked) => !checked);
            }}
          />
          request timestampSigned?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealAttendeeSemaphoreId}
            onChange={(): void => {
              setRevealAttendeeSemaphoreId((checked) => !checked);
            }}
          />
          request attendeeSemaphoreId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealIsConsumed}
            onChange={(): void => {
              setRevealIsConsumed((checked) => !checked);
            }}
          />
          request isConsumed?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealIsRevoked}
            onChange={(): void => {
              setRevealIsRevoked((checked) => !checked);
            }}
          />
          request isRevoked?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealAttendeeEmail}
            onChange={(): void => {
              setRevealAttendeeEmail((checked) => !checked);
            }}
          />
          request attendeeEmail?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealAttendeeName}
            onChange={(): void => {
              setRevealAttendeeName((checked) => !checked);
            }}
          />
          request attendeeName?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealFieldsUserProvided}
            onChange={(): void => {
              setRevealFieldsUserProvided((checked) => !checked);
            }}
          />
          allow reveal fields customization?
        </label>
        <br />
        [Prove Screen Only]
        <br />
        Valid event ids, comma separated (or empty for no validation):
        <textarea
          cols={45}
          rows={12}
          value={validDisplayEventIdsInput}
          onChange={(e): void => {
            setDisplayValidEventIdsInput(e.target.value);
          }}
        />
        <br />
        Valid product ids, comma separated (or empty for no validation):
        <textarea
          cols={45}
          rows={12}
          value={validDisplayProductIdsInput}
          onChange={(e): void => {
            setDisplayValidProductIdsInput(e.target.value);
          }}
        />
        <br />
        {!!pcd && (
          <>
            <p>Got Zupass ZKEdDSA Event Ticket Proof from Zupass</p>
            <CollapsableCode code={JSON.stringify(pcd, null, 2)} />
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && (
              <>
                <p>✅ Proof is valid</p>
                <p>{`Ticket ID: ${
                  pcd.claim.partialTicket.ticketId !== undefined
                    ? pcd.claim.partialTicket.ticketId
                    : "HIDDEN"
                }`}</p>
                <p>{`Event ID: ${
                  pcd.claim.partialTicket.eventId !== undefined
                    ? pcd.claim.partialTicket.eventId
                    : "HIDDEN"
                }`}</p>
                <p>{`Valid Event IDs: ${
                  pcd.claim.validEventIds !== undefined
                    ? "[" + pcd.claim.validEventIds.join(", ") + "]"
                    : "UNCHECKED"
                }`}</p>
                <p>{`Product ID: ${
                  pcd.claim.partialTicket.productId !== undefined
                    ? pcd.claim.partialTicket.productId
                    : "HIDDEN"
                }`}</p>
                <p>{`Timestamp Consumed: ${
                  // timestampConsumed can be 0, which is falsey
                  // so test for undefined
                  pcd.claim.partialTicket.timestampConsumed !== undefined
                    ? pcd.claim.partialTicket.timestampConsumed
                    : "HIDDEN"
                }`}</p>
                <p>{`Timestamp Signed: ${
                  pcd.claim.partialTicket.timestampSigned !== undefined
                    ? pcd.claim.partialTicket.timestampSigned
                    : "HIDDEN"
                }`}</p>
                <p>{`Semaphore ID: ${
                  pcd.claim.partialTicket.attendeeSemaphoreId !== undefined
                    ? pcd.claim.partialTicket.attendeeSemaphoreId
                    : "HIDDEN"
                }`}</p>
                <p>{`Is Consumed?: ${
                  // isConsumed can be true, false, or undefined
                  // undefined means it is not revealed in this PCD
                  pcd.claim.partialTicket.isConsumed !== undefined
                    ? pcd.claim.partialTicket.isConsumed
                    : "HIDDEN"
                }`}</p>
                <p>{`Is Revoked?: ${
                  // isRevoked can be true, false, or undefined
                  // undefined means it is not revealed in this PCD
                  pcd.claim.partialTicket.isRevoked !== undefined
                    ? pcd.claim.partialTicket.isRevoked
                    : "HIDDEN"
                }`}</p>
                <p>{`Attendee Email: ${
                  // attendeeEmail can be true, false, or undefined
                  // undefined means it is not revealed in this PCD
                  pcd.claim.partialTicket.attendeeEmail !== undefined
                    ? pcd.claim.partialTicket.attendeeEmail
                    : "HIDDEN"
                }`}</p>
                <p>{`Attendee Name: ${
                  // attendeeName can be true, false, or undefined
                  // undefined means it is not revealed in this PCD
                  pcd.claim.partialTicket.attendeeName !== undefined
                    ? pcd.claim.partialTicket.attendeeName
                    : "HIDDEN"
                }`}</p>
                <p>{`Signer: ${pcd.claim.signer}`}</p>
                <p>{`Watermark: ${pcd.claim.watermark}`}</p>
                {pcd.claim.externalNullifier && (
                  <p>{`External Nullifier: ${pcd.claim.externalNullifier}`}</p>
                )}
                {pcd.claim.nullifierHash && (
                  <p>{`Nullifier Hash: ${pcd.claim.nullifierHash}`}</p>
                )}
              </>
            )}
          </>
        )}
        {valid && <p>Welcome, anon</p>}
      </ExampleContainer>
    </>
  );
}

/**
 * Opens a Zupass popup to prove a prove a ZKEdDSATicketPCD.
 *
 * @param urlToZupassWebsite URL of the Zupass website
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param fieldsToReveal Ticket data fields that site is requesting for user to reveal
 * @param fieldsToRevealUserProvided Whether the user can customize the fields to reveal
 * @param watermark Challenge to watermark this proof to
 * @param externalNullifier Optional unique identifier for this ZKEdDSAEventTicketPCD
 */
export function openZKEdDSAEventTicketPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  fieldsToRevealUserProvided: boolean,
  watermark: bigint,
  validEventIds: string[],
  displayValidEventIds: string[],
  displayValidProductIds: string[],
  externalNullifier?: string
): void {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: displayValidEventIds,
        productIds: displayValidProductIds,
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
      userProvided: fieldsToRevealUserProvided
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    }
  };

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(urlToZupassWebsite, popupUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Proof",
    description: "zkeddsa ticket pcd request"
  });

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a ZKEdDSA ticket proof.
 */
function useZKEdDSAEventTicketProof(
  pcdStr: string,
  onVerified: (valid: boolean) => void,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  externalNullifier?: string
): { pcd: ZKEdDSAEventTicketPCD | undefined; error: any } {
  const [error, _setError] = useState<Error | undefined>();
  const zkEdDSAEventTicketPCD = useSerializedPCD(
    ZKEdDSAEventTicketPCDPackage,
    pcdStr
  );

  useEffect(() => {
    if (zkEdDSAEventTicketPCD) {
      verifyProof(
        zkEdDSAEventTicketPCD,
        fieldsToReveal,
        watermark,
        externalNullifier
      ).then(onVerified);
    }
  }, [
    zkEdDSAEventTicketPCD,
    fieldsToReveal,
    watermark,
    externalNullifier,
    onVerified
  ]);

  return {
    pcd: zkEdDSAEventTicketPCD,
    error
  };
}

async function verifyProof(
  pcd: ZKEdDSAEventTicketPCD,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  externalNullifier?: string
): Promise<boolean> {
  const { verify } = ZKEdDSAEventTicketPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  // verify the claim is for the correct fields requested, watermark, and externalNullifier
  const sameExternalNullifier =
    pcd.claim.externalNullifier === externalNullifier ||
    (!pcd.claim.externalNullifier && !externalNullifier);

  const sameWatermark = pcd.claim.watermark === watermark.toString();

  const pTicket = pcd.claim.partialTicket;
  const samefieldsToReveal =
    Object.prototype.hasOwnProperty.call(pTicket, "ticketId") ===
      fieldsToReveal.revealTicketId &&
    Object.prototype.hasOwnProperty.call(pTicket, "eventId") ===
      fieldsToReveal.revealEventId &&
    Object.prototype.hasOwnProperty.call(pTicket, "productId") ===
      fieldsToReveal.revealProductId;
  Object.prototype.hasOwnProperty.call(pTicket, "timestampConsumed") ===
    fieldsToReveal.revealTimestampConsumed &&
    Object.prototype.hasOwnProperty.call(pTicket, "timestampSigned") ===
      fieldsToReveal.revealTimestampSigned &&
    Object.prototype.hasOwnProperty.call(pTicket, "attendeeSemaphoreId") ===
      fieldsToReveal.revealAttendeeSemaphoreId &&
    Object.prototype.hasOwnProperty.call(pTicket, "isConsumed") ===
      fieldsToReveal.revealIsConsumed &&
    Object.prototype.hasOwnProperty.call(pTicket, "isRevoked") ===
      fieldsToReveal.revealIsRevoked;

  return sameExternalNullifier && sameWatermark && samefieldsToReveal;
}
