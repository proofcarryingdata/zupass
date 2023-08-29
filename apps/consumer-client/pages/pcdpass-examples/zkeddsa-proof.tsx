import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructPassportPcdGetRequestUrl,
  openPassportPopup,
  usePassportPopupMessages,
  useSerializedPCD
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { generateMessageHash } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsRequest,
  ZKEdDSATicketPCD,
  ZKEdDSATicketPCDArgs,
  ZKEdDSATicketPCDPackage
} from "@pcd/zk-eddsa-ticket-pcd";
import path from "path";
import { useEffect, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PCDPASS_URL } from "../../src/constants";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
 * request a Semaphore Group Membership PCD as a third party developer.
 */
export default function Page() {
  const watermark = generateMessageHash(
    "consumer-client zk-eddsa-ticket-pcd challenge"
  );
  const externalNullifier = generateMessageHash("consumer-client").toString();

  const fieldsRequested: EdDSATicketFieldsRequest = {
    revealTicketId: false,
    revealEventId: true,
    revealProductId: true,
    revealTimestampConsumed: false,
    revealTimestampSigned: false,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false
  };

  // Populate PCD from either client-side or server-side proving using passport popup
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean) => {
    setValid(valid);
  };

  const { pcd } = useZKEdDSATicketProof(
    pcdStr,
    onVerified,
    fieldsRequested,
    watermark,
    externalNullifier
  );

  return (
    <>
      <HomeLink />
      <h2>PCDPass ZKEdDSA Ticket Proof</h2>
      <p>
        This page shows a working example of an integration with the PCDPass
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
              window.location.origin + "/popup",
              fieldsRequested,
              watermark,
              externalNullifier
            )
          }
          disabled={valid}
        >
          Request PCDpass Membership Proof
        </button>
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
                  pcd.claim.partialTicket.ticketId || "HIDDEN"
                }`}</p>
                <p>{`Event ID: ${
                  pcd.claim.partialTicket.eventId || "HIDDEN"
                }`}</p>
                <p>{`Product ID: ${
                  pcd.claim.partialTicket.productId || "HIDDEN"
                }`}</p>
                <p>{`Semaphore ID: ${
                  pcd.claim.partialTicket.attendeeSemaphoreId || "HIDDEN"
                }`}</p>
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
 * Opens a passport popup to generate a Zuzalu membership proof.
 *
 * @param urlToPassportWebsite URL of passport website
 * @param popupUrl Route where the usePassportPopupSetup hook is being served from
 * @param fieldsRequested Ticket data fields that site is requesting for user to reveal
 * @param watermark Challenge to watermark this proof to
 * @param externalNullifier Optional unique identifier for this ZKEdDSATicketPCD
 */
export function openZKEdDSATicketPopup(
  urlToPassportWebsite: string,
  popupUrl: string,
  fieldsRequested: EdDSATicketFieldsRequest,
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
    fieldsRequested: {
      argumentType: ArgumentTypeName.Object,
      value: fieldsRequested,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    }
  };

  if (externalNullifier) {
    args.externalNullifier = {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier,
      userProvided: false
    };
  }

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
  fieldsRequested: EdDSATicketFieldsRequest,
  watermark: bigint,
  externalNullifier?: string
): { pcd: ZKEdDSATicketPCD | undefined; error: any } {
  const [error, setError] = useState<Error | undefined>();
  const zkEdDSATicketPCD = useSerializedPCD(ZKEdDSATicketPCDPackage, pcdStr);

  useEffect(() => {
    if (zkEdDSATicketPCD) {
      verifyProof(
        zkEdDSATicketPCD,
        fieldsRequested,
        watermark,
        externalNullifier
      ).then(onVerified);
    }
  }, [
    zkEdDSATicketPCD,
    fieldsRequested,
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
  fieldsRequested: EdDSATicketFieldsRequest,
  watermark: bigint,
  externalNullifier?: string
): Promise<boolean> {
  // TODO: after eddsa keys are represented in normal form and not montgomery
  // form, we can remove the call to Package initialization logic and also
  // remove the package artifacts in the ../../public directory (for now)

  // ordinarily, we wouldn't need to init the package to call verify
  // however, because converting the claim into public signals for verification
  // requires us to convert the signing key from montgomery form, we need
  // to use methods on circomlibjs.babyJub.F. and to do this, we need to
  // build babyJub, which happens in init

  // once we've made it so that keys are no longer in montgomery form, we won't
  // need to do this anymore
  // in general i am of the opinion that verification shouldn't require you
  // to call init...
  const fullPath = path.join(__dirname, "../../public");
  await ZKEdDSATicketPCDPackage.init?.({
    wasmFilePath: fullPath + "/zkeddsa-artifacts-unsafe/eddsaTicket.wasm",
    zkeyFilePath: fullPath + "/zkeddsa-artifacts-unsafe/eddsaTicket.zkey"
  });

  const { verify } = ZKEdDSATicketPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  // verify the claim is for the correct fields requested, watermark, and externalNullifier
  const sameExternalNullifier =
    pcd.claim.externalNullifier === externalNullifier ||
    (!pcd.claim.externalNullifier && !externalNullifier);

  const sameWatermark = pcd.claim.watermark === watermark.toString();

  const pTicket = pcd.claim.partialTicket;
  const sameFieldsRequested =
    Object.prototype.hasOwnProperty.call(pTicket, "ticketId") ===
      fieldsRequested.revealTicketId &&
    Object.prototype.hasOwnProperty.call(pTicket, "eventId") ===
      fieldsRequested.revealEventId &&
    Object.prototype.hasOwnProperty.call(pTicket, "productId") ===
      fieldsRequested.revealProductId;
  Object.prototype.hasOwnProperty.call(pTicket, "timestampConsumed") ===
    fieldsRequested.revealTimestampConsumed &&
    Object.prototype.hasOwnProperty.call(pTicket, "timestampSigned") ===
      fieldsRequested.revealTimestampSigned &&
    Object.prototype.hasOwnProperty.call(pTicket, "attendeeSemaphoreId") ===
      fieldsRequested.revealAttendeeSemaphoreId &&
    Object.prototype.hasOwnProperty.call(pTicket, "isConsumed") ===
      fieldsRequested.revealIsConsumed &&
    Object.prototype.hasOwnProperty.call(pTicket, "isRevoked") ===
      fieldsRequested.revealIsRevoked;

  return sameExternalNullifier && sameWatermark && sameFieldsRequested;
}
