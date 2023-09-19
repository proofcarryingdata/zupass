import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructPassportPcdGetRequestUrl,
  openPassportPopup,
  usePassportPopupMessages,
  useSerializedPCD
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSATicketPCD,
  ZKEdDSATicketPCDArgs,
  ZKEdDSATicketPCDPackage
} from "@pcd/zk-eddsa-ticket-pcd";
import { useEffect, useMemo, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PCDPASS_URL } from "../../constants";

/**
 * Example page for proving ZKEdDSATicketPCD.
 */
export default function Page() {
  const watermark = generateSnarkMessageHash(
    "consumer-client zk-eddsa-ticket-pcd challenge"
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

  const fieldsToReveal: EdDSATicketFieldsToReveal = useMemo(
    () => ({
      revealTicketId,
      revealEventId,
      revealProductId,
      revealTimestampConsumed,
      revealTimestampSigned,
      revealAttendeeSemaphoreId,
      revealIsConsumed,
      revealIsRevoked
    }),
    [
      revealTicketId,
      revealEventId,
      revealProductId,
      revealTimestampConsumed,
      revealTimestampSigned,
      revealAttendeeSemaphoreId,
      revealIsConsumed,
      revealIsRevoked
    ]
  );

  // Populate PCD from either client-side or server-side proving using passport popup
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean) => {
    setValid(valid);
  };

  const { pcd } = useZKEdDSATicketProof(
    pcdStr,
    onVerified,
    fieldsToReveal,
    watermark,
    externalNullifier
  );

  return (
    <>
      <HomeLink />
      <h2>PCDpass ZKEdDSA Ticket Proof</h2>
      <p>
        This page shows a working example of an integration with the PCDpass
        application which requests and verifies that the user has a certain
        EdDSA-signed ticket.
      </p>
      <p>
        To be able to use this flow in production, to be able to generate this
        proof, you have to have signed in on{" "}
        <a href={"https://pcdpass.xyz"}>pcdpass.xyz</a>. To use this flow
        locally, you either have to sign in on a local instance of the passport.
      </p>
      <p>
        The underlying PCD that this example uses is{" "}
        <code>ZKEdDSATicketPCD</code>. You can find more documentation regarding
        this PCD{" "}
        <CodeLink file="/tree/main/packages/zk-eddsa-ticket-pcd">
          here on GitHub
        </CodeLink>{" "}
        .
      </p>
      <ExampleContainer>
        <button
          onClick={() =>
            openZKEdDSATicketPopup(
              PCDPASS_URL,
              window.location.origin + "#/popup",
              fieldsToReveal,
              watermark,
              externalNullifier
            )
          }
          disabled={valid}
        >
          Request PCDpass Ticket Proof
        </button>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealTicketId}
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
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
            onChange={() => {
              setRevealIsRevoked((checked) => !checked);
            }}
          />
          request isRevoked?
        </label>
        {!!pcd && (
          <>
            <p>Got PCDpass ZKEdDSA Proof from Passport</p>
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
 * Opens a passport popup to prove a ZKEdDSATicketPCD.
 *
 * @param urlToPassportWebsite URL of passport website
 * @param popupUrl Route where the usePassportPopupSetup hook is being served from
 * @param fieldsToReveal Ticket data fields that site is requesting for user to reveal
 * @param watermark Challenge to watermark this proof to
 * @param externalNullifier Optional unique identifier for this ZKEdDSATicketPCD
 */
export function openZKEdDSATicketPopup(
  urlToPassportWebsite: string,
  popupUrl: string,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  externalNullifier?: string
) {
  const args: ZKEdDSATicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.Object,
      value: fieldsToReveal,
      userProvided: false
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

  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof ZKEdDSATicketPCDPackage
  >(urlToPassportWebsite, popupUrl, ZKEdDSATicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Proof",
    description: "zkeddsa ticket pcd request"
  });

  openPassportPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a ZKEdDSA ticket proof.
 */
function useZKEdDSATicketProof(
  pcdStr: string,
  onVerified: (valid: boolean) => void,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  externalNullifier?: string
): { pcd: ZKEdDSATicketPCD | undefined; error: any } {
  const [error, _setError] = useState<Error | undefined>();
  const zkEdDSATicketPCD = useSerializedPCD(ZKEdDSATicketPCDPackage, pcdStr);

  useEffect(() => {
    if (zkEdDSATicketPCD) {
      verifyProof(
        zkEdDSATicketPCD,
        fieldsToReveal,
        watermark,
        externalNullifier
      ).then(onVerified);
    }
  }, [
    zkEdDSATicketPCD,
    fieldsToReveal,
    watermark,
    externalNullifier,
    onVerified
  ]);

  return {
    pcd: zkEdDSATicketPCD,
    error
  };
}

async function verifyProof(
  pcd: ZKEdDSATicketPCD,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  externalNullifier?: string
): Promise<boolean> {
  const { verify } = ZKEdDSATicketPCDPackage;
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
