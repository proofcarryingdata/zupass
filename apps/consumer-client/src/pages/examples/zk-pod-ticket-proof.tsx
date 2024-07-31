import { gpcArtifactDownloadURL } from "@pcd/gpc";
import {
  constructZupassPcdGetRequestUrl,
  openZupassPopup,
  useSerializedPCD,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import {
  checkClaimAgainstProofRequest,
  checkTicketPatterns,
  makeProofRequest,
  PODTicketFieldsToReveal,
  ProofRequest,
  TicketMatchPatterns,
  ZKPODTicketPCD,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDPackage
} from "@pcd/zk-pod-ticket-pcd";
import JSONBig from "json-bigint";
import { useEffect, useMemo, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL } from "../../constants";

export default function Page(): JSX.Element {
  const watermark = generateSnarkMessageHash(
    "consumer-client zk-pod-ticket-pcd challenge"
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

  const [patternsText, setPatternsText] = useState<string>(
    JSON.stringify([
      {
        signerPublicKey: "ZeZomy3iAu0A37TrJUAJ+76eYjiB3notl9jiRF3vRJE"
      }
    ])
  );

  const patterns = useMemo(() => {
    try {
      const patterns = JSON.parse(patternsText);
      checkTicketPatterns(patterns);
      return { valid: true, patterns };
    } catch (e) {
      return { valid: false, patterns: [] };
    }
  }, [patternsText]);

  const fieldsToReveal: PODTicketFieldsToReveal = useMemo(
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

  const proofRequest = useMemo(() => {
    return makeProofRequest(
      constructZKPODTicketPCDArgs(
        fieldsToReveal,
        revealFieldsUserProvided,
        true,
        watermark,
        patterns.patterns,
        externalNullifier
      )
    );
  }, [
    fieldsToReveal,
    revealFieldsUserProvided,
    watermark,
    patterns,
    externalNullifier
  ]);

  const { pcd } = useZKPODTicketProof(pcdStr, onVerified, proofRequest);

  return (
    <>
      <HomeLink />
      <h2>ZKPODTicket Proof</h2>
      <p>
        This page shows a working example of an integration with Zupass which
        requests and verifies that the user has a POD-signed ticket to one of a
        list of valid events.
      </p>
      <p>
        The underlying PCD that this example uses is <code>ZKPODTicketPCD</code>
        . You can find more documentation regarding this PCD{" "}
        <CodeLink file="/tree/main/packages/pcd/zk-pod-ticket-pcd">
          here on GitHub
        </CodeLink>{" "}
        .
      </p>
      <ExampleContainer>
        <button
          onClick={(): void =>
            openZKPODTicketPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              fieldsToReveal,
              revealFieldsUserProvided,
              true,
              watermark,
              patterns.patterns,
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
          value={patternsText}
          onChange={(e): void => setPatternsText(e.target.value)}
          style={{
            ...(patterns.valid
              ? {}
              : { outline: "solid 1px red", backgroundColor: "#fff0f0" })
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
        {!!pcd && (
          <>
            <p>Got Zupass ZKPODTicket Proof from Zupass</p>
            <CollapsableCode
              code={JSONBig({ useNativeBigInt: true }).stringify(pcd, null, 2)}
            />
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
                <p>{`Signer: ${pcd.claim.signerPublicKey}`}</p>
                <p>{`Watermark: ${pcd.claim.watermark.value.toString()}`}</p>
                {pcd.claim.externalNullifier && (
                  <p>{`External Nullifier: ${pcd.claim.externalNullifier.value.toString()}`}</p>
                )}
                {pcd.claim.nullifierHash && (
                  <p>{`Nullifier Hash: ${pcd.claim.nullifierHash.toString()}`}</p>
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

function constructZKPODTicketPCDArgs(
  fieldsToReveal: PODTicketFieldsToReveal,
  fieldsToRevealUserProvided: boolean,
  revealSignerPublicKey: boolean,
  watermark: bigint,
  patterns: TicketMatchPatterns,
  externalNullifier?: string
): ZKPODTicketPCDArgs {
  const args: ZKPODTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: PODTicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        ticketPatterns: patterns,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: fieldsToRevealUserProvided
    },
    revealSignerPublicKey: {
      argumentType: ArgumentTypeName.Boolean,
      value: revealSignerPublicKey,
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.String,
      value: externalNullifier,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.String,
      value: watermark.toString(),
      userProvided: false
    }
  };

  return args;
}

/**
 * Opens a Zupass popup to prove a prove a ZKPODTicketPCD.
 *
 * @param urlToZupassWebsite URL of the Zupass website
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param fieldsToReveal Ticket data fields that site is requesting for user to reveal
 * @param fieldsToRevealUserProvided Whether the user can customize the fields to reveal
 * @param revealSignerPublicKey Whether to reveal the signer public key
 * @param watermark Challenge to watermark this proof to
 * @param patterns Ticket match patterns
 * @param externalNullifier Optional unique identifier for this ZKPODTicketPCD
 */
export function openZKPODTicketPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  fieldsToReveal: PODTicketFieldsToReveal,
  fieldsToRevealUserProvided: boolean,
  revealSignerPublicKey: boolean,
  watermark: bigint,
  patterns: TicketMatchPatterns,
  externalNullifier?: string
): void {
  const args = constructZKPODTicketPCDArgs(
    fieldsToReveal,
    fieldsToRevealUserProvided,
    revealSignerPublicKey,
    watermark,
    patterns,
    externalNullifier
  );

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKPODTicketPCDPackage
  >(urlToZupassWebsite, popupUrl, ZKPODTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKPODTicketPCD Proof",
    description: "zkpodticketpcd request"
  });

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a ZK POD ticket proof.
 */
function useZKPODTicketProof(
  pcdStr: string,
  onVerified: (valid: boolean) => void,
  proofRequest: ProofRequest
): { pcd: ZKPODTicketPCD | undefined; error: Error | undefined } {
  const [error, _setError] = useState<Error | undefined>();
  const zkPODTicketPCD = useSerializedPCD(ZKPODTicketPCDPackage, pcdStr);

  useEffect(() => {
    if (zkPODTicketPCD) {
      verifyProof(zkPODTicketPCD, proofRequest).then(onVerified);
    }
  }, [zkPODTicketPCD, onVerified, proofRequest]);

  return {
    pcd: zkPODTicketPCD,
    error
  };
}

async function verifyProof(
  pcd: ZKPODTicketPCD,
  proofRequest: ProofRequest
): Promise<boolean> {
  await ZKPODTicketPCDPackage.init?.({
    zkArtifactPath: gpcArtifactDownloadURL("unpkg", "prod", undefined)
  });
  const { verify } = ZKPODTicketPCDPackage;
  const verified = await verify(pcd);
  if (!verified) {
    console.error("Proof is not valid");
    return false;
  }

  try {
    checkClaimAgainstProofRequest(pcd.claim, proofRequest);
  } catch (e) {
    console.error("Proof is not valid:", e);
    return false;
  }

  return true;
}
