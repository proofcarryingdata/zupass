import { EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
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
  ZKEdDSAFrogPCD,
  ZKEdDSAFrogPCDArgs,
  ZKEdDSAFrogPCDPackage
} from "@pcd/zk-eddsa-frog-pcd";
import { useEffect, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL } from "../../constants";

export default function Page(): JSX.Element {
  const externalNullifier = generateSnarkMessageHash(
    "consumer-client-nullifier"
  ).toString();
  const watermark = generateSnarkMessageHash(
    "consumer-client-watermark"
  ).toString();

  // Populate PCD from either client-side or server-side proving using the Zupass popup
  const [pcdStr] = useZupassPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean): void => {
    setValid(valid);
  };

  const { pcd } = useZKEdDSAFrogProof(
    pcdStr,
    onVerified,
    externalNullifier,
    watermark
  );

  return (
    <>
      <HomeLink />
      <h2>ZKEdDSA Frog Proof</h2>
      <p>
        This page shows a working example of an integration with Zupass which
        requests and verifies that the user has an EdDSA-signed frog, without
        revealing the user's semaphore identity.
      </p>
      <ExampleContainer>
        <button
          onClick={(): void =>
            openZKEdDSAFrogPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              externalNullifier,
              watermark
            )
          }
          disabled={valid}
        >
          Request ZKEdDSA Frog Proof from Zupass
        </button>
        <br />
        <br />
        {!!pcd && (
          <>
            <p>Got ZKEdDSA Frog Proof from Zupass</p>
            <CollapsableCode code={JSON.stringify(pcd, null, 2)} />
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && (
              <>
                <p>✅ Proof is valid</p>
                <p>{`Frog ID: ${pcd.claim.partialFrog.frogId}`}</p>
                <p>{`Biome: ${pcd.claim.partialFrog.biome}`}</p>
                <p>{`Rarity: ${pcd.claim.partialFrog.rarity}`}</p>
                <p>{`Temperament: ${pcd.claim.partialFrog.temperament}`}</p>
                <p>{`Jump: ${pcd.claim.partialFrog.jump}`}</p>
                <p>{`Speed: ${pcd.claim.partialFrog.speed}`}</p>
                <p>{`Intelligence: ${pcd.claim.partialFrog.intelligence}`}</p>
                <p>{`Beauty: ${pcd.claim.partialFrog.beauty}`}</p>
                <p>{`Timestamp Signed: ${pcd.claim.partialFrog.timestampSigned}`}</p>
                <p>{`Owner Semaphore Id: ${pcd.claim.partialFrog.ownerSemaphoreId}`}</p>
                <p>{`Signer: ${pcd.claim.signerPublicKey}`}</p>
                <p>{`External Nullifier: ${pcd.claim.externalNullifier}`}</p>
                <p>{`Nullifier Hash: ${pcd.claim.nullifierHash}`}</p>
                <p>{`Watermark: ${pcd.claim.watermark}`}</p>
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
 * Opens a Zupass popup to prove a ZKEdDSAFrogPCD.
 *
 * @param urlToZupassWebsite URL of the Zupass website
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param externalNullifier Optional unique identifier for this ZKEdDSAFrogPCD
 */
export function openZKEdDSAFrogPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  externalNullifier: string,
  watermark: string
): void {
  const args: ZKEdDSAFrogPCDArgs = {
    frog: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSAFrogPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        notFoundMessage: "No eligible EdDSA Frog PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark,
      userProvided: false
    }
  };

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAFrogPCDPackage
  >(urlToZupassWebsite, popupUrl, ZKEdDSAFrogPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Frog Proof",
    description: "zk eddsa frog pcd request"
  });

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a ZKEdDSA frog proof.
 */
function useZKEdDSAFrogProof(
  pcdStr: string,
  onVerified: (valid: boolean) => void,
  externalNullifier: string,
  watermark: string
): { pcd: ZKEdDSAFrogPCD | undefined; error: Error } {
  const [error, _setError] = useState<Error | undefined>();
  const zkEdDSAFrogPCD = useSerializedPCD(ZKEdDSAFrogPCDPackage, pcdStr);

  useEffect(() => {
    if (zkEdDSAFrogPCD) {
      verifyProof(zkEdDSAFrogPCD, externalNullifier, watermark).then(
        onVerified
      );
    }
  }, [zkEdDSAFrogPCD, externalNullifier, watermark, onVerified]);

  return {
    pcd: zkEdDSAFrogPCD,
    error
  };
}

async function verifyProof(
  pcd: ZKEdDSAFrogPCD,
  externalNullifier: string,
  watermark: string
): Promise<boolean> {
  const { verify } = ZKEdDSAFrogPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  // verify the claim is for the correct externalNullifier
  const sameExternalNullifier =
    pcd.claim.externalNullifier === externalNullifier ||
    (!pcd.claim.externalNullifier && !externalNullifier);
  const sameWatermark = pcd.claim.watermark === watermark;
  return sameExternalNullifier && sameWatermark;
}
