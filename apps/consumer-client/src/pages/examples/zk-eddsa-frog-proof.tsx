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
  EdDSAFrogFieldsToReveal,
  ZKEdDSAFrogPCD,
  ZKEdDSAFrogPCDArgs,
  ZKEdDSAFrogPCDPackage
} from "@pcd/zk-eddsa-frog-pcd";
import { useEffect, useMemo, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL } from "../../constants";

export default function Page() {
  const externalNullifier = generateSnarkMessageHash(
    "consumer-client-nullifier"
  ).toString();
  const watermark = generateSnarkMessageHash(
    "consumer-client-watermark"
  ).toString();

  const [revealFieldsUserProvided, setRevealFieldsUserProvided] =
    useState<boolean>(false);
  const [revealFrogId, setRevealFrogId] = useState<boolean>(false);
  const [revealBiome, setRevealBiome] = useState<boolean>(false);
  const [revealRarity, setRevealRarity] = useState<boolean>(false);
  const [revealTemperament, setRevealTemperament] = useState<boolean>(false);
  const [revealJump, setRevealJump] = useState<boolean>(false);
  const [revealSpeed, setRevealSpeed] = useState<boolean>(false);
  const [revealIntelligence, setRevealIntelligence] = useState<boolean>(false);
  const [revealBeauty, setRevealBeauty] = useState<boolean>(false);
  const [revealTimestampSigned, setRevealTimestampSigned] =
    useState<boolean>(false);
  const [revealOwnerSemaphoreId, setRevealOwnerSemaphoreId] =
    useState<boolean>(false);
  const [revealNullifierHash, setRevealNullifierHash] =
    useState<boolean>(false);

  const fieldsToReveal: EdDSAFrogFieldsToReveal = useMemo(
    () => ({
      revealFrogId,
      revealBiome,
      revealRarity,
      revealTemperament,
      revealJump,
      revealSpeed,
      revealIntelligence,
      revealBeauty,
      revealTimestampSigned,
      revealOwnerSemaphoreId
    }),
    [
      revealFrogId,
      revealBiome,
      revealRarity,
      revealTemperament,
      revealJump,
      revealSpeed,
      revealIntelligence,
      revealBeauty,
      revealTimestampSigned,
      revealOwnerSemaphoreId
    ]
  );

  // Populate PCD from either client-side or server-side proving using the Zupass popup
  const [pcdStr] = useZupassPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean) => {
    setValid(valid);
  };

  const { pcd } = useZKEdDSAFrogProof(
    pcdStr,
    onVerified,
    fieldsToReveal,
    externalNullifier,
    revealNullifierHash,
    watermark
  );

  return (
    <>
      <HomeLink />
      <h2>ZKEdDSA Frog Proof</h2>
      <p>
        This page shows a working example of an integration with Zupass which
        requests and verifies that the user has an EdDSA-signed frog.
      </p>
      <ExampleContainer>
        <button
          onClick={() =>
            openZKEdDSAFrogPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              fieldsToReveal,
              revealFieldsUserProvided,
              externalNullifier,
              revealNullifierHash,
              watermark
            )
          }
          disabled={valid}
        >
          Request ZKEdDSA Frog Proof from Zupass
        </button>
        <br />

        <label>
          <input
            type="checkbox"
            checked={revealFieldsUserProvided}
            onChange={() => {
              setRevealFieldsUserProvided((checked) => !checked);
            }}
          />
          allow reveal fields customization?
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={revealFrogId}
            onChange={() => {
              setRevealFrogId((checked) => !checked);
            }}
          />
          request frogId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealBiome}
            onChange={() => {
              setRevealBiome((checked) => !checked);
            }}
          />
          request biome?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealRarity}
            onChange={() => {
              setRevealRarity((checked) => !checked);
            }}
          />
          request rarity?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealTemperament}
            onChange={() => {
              setRevealTemperament((checked) => !checked);
            }}
          />
          request temperament?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealJump}
            onChange={() => {
              setRevealJump((checked) => !checked);
            }}
          />
          request jump?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealSpeed}
            onChange={() => {
              setRevealSpeed((checked) => !checked);
            }}
          />
          request speed?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealIntelligence}
            onChange={() => {
              setRevealIntelligence((checked) => !checked);
            }}
          />
          request intelligence?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealBeauty}
            onChange={() => {
              setRevealBeauty((checked) => !checked);
            }}
          />
          request beauty?
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
            checked={revealOwnerSemaphoreId}
            onChange={() => {
              setRevealOwnerSemaphoreId((checked) => !checked);
            }}
          />
          request ownerSemaphoreId?
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={revealNullifierHash}
            onChange={() => {
              setRevealNullifierHash((checked) => !checked);
            }}
          />
          request nullifierHash?
        </label>
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
                <p>{`Frog ID: ${pcd.claim.partialFrog.frogId || "HIDDEN"}`}</p>
                <p>{`Biome: ${pcd.claim.partialFrog.biome || "HIDDEN"}`}</p>
                <p>{`Rarity: ${pcd.claim.partialFrog.rarity || "HIDDEN"}`}</p>
                <p>{`Temperament: ${
                  pcd.claim.partialFrog.temperament || "HIDDEN"
                }`}</p>
                <p>{`Jump: ${pcd.claim.partialFrog.jump || "HIDDEN"}`}</p>
                <p>{`Speed: ${pcd.claim.partialFrog.speed || "HIDDEN"}`}</p>
                <p>{`Intelligence: ${
                  pcd.claim.partialFrog.intelligence || "HIDDEN"
                }`}</p>
                <p>{`Beauty: ${pcd.claim.partialFrog.beauty || "HIDDEN"}`}</p>
                <p>{`Timestamp Signed: ${
                  pcd.claim.partialFrog.timestampSigned || "HIDDEN"
                }`}</p>
                <p>{`Owner Semaphore Id: ${
                  pcd.claim.partialFrog.ownerSemaphoreId || "HIDDEN"
                }`}</p>
                <p>{`Signer: ${pcd.claim.signerPublicKey}`}</p>
                <p>{`External Nullifier: ${pcd.claim.externalNullifier}`}</p>
                <p>{`Nullifier Hash: ${
                  pcd.claim.nullifierHash || "HIDDEN"
                }`}</p>
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
 * @param fieldsToReveal Frog data fields that site is requesting for user to reveal
 * @param fieldsToRevealUserProvided Whether the user can customize the fields to reveal
 * @param externalNullifier Optional unique identifier for this ZKEdDSAFrogPCD
 * @param revealNullifierHash Whether to reveal the nullifier hash
 * @param watermark Challenge to watermark this proof to
 */
export function openZKEdDSAFrogPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  fieldsToReveal: EdDSAFrogFieldsToReveal,
  revealFieldsUserProvided: boolean,
  externalNullifier: string,
  revealNullifierHash: boolean,
  watermark: string
) {
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
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: revealFieldsUserProvided
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier,
      userProvided: false
    },
    revealNullifierHash: {
      argumentType: ArgumentTypeName.Boolean,
      value: revealNullifierHash,
      userProvided: revealFieldsUserProvided
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
  fieldsToReveal: EdDSAFrogFieldsToReveal,
  externalNullifier: string,
  revealNullifierHash: boolean,
  watermark: string
): { pcd: ZKEdDSAFrogPCD | undefined; error: any } {
  const [error, _setError] = useState<Error | undefined>();
  const zkEdDSAFrogPCD = useSerializedPCD(ZKEdDSAFrogPCDPackage, pcdStr);

  useEffect(() => {
    if (zkEdDSAFrogPCD) {
      verifyProof(
        zkEdDSAFrogPCD,
        fieldsToReveal,
        externalNullifier,
        revealNullifierHash,
        watermark
      ).then(onVerified);
    }
  }, [
    zkEdDSAFrogPCD,
    fieldsToReveal,
    externalNullifier,
    revealNullifierHash,
    watermark,
    onVerified
  ]);

  return {
    pcd: zkEdDSAFrogPCD,
    error
  };
}

async function verifyProof(
  pcd: ZKEdDSAFrogPCD,
  fieldsToReveal: EdDSAFrogFieldsToReveal,
  externalNullifier: string,
  revealNullifierHash: boolean,
  watermark: string
): Promise<boolean> {
  const { verify } = ZKEdDSAFrogPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  // verify the claim is for the correct externalNullifier, watermark,
  // and the correct fields requested
  const sameExternalNullifier =
    pcd.claim.externalNullifier === externalNullifier ||
    (!pcd.claim.externalNullifier && !externalNullifier);

  const sameWatermark = pcd.claim.watermark === watermark;

  const frog = pcd.claim.partialFrog;
  const sameFieldsToReveal =
    (frog.frogId !== undefined) === fieldsToReveal.revealFrogId &&
    (frog.biome !== undefined) === fieldsToReveal.revealBiome &&
    (frog.rarity !== undefined) === fieldsToReveal.revealRarity &&
    (frog.temperament !== undefined) === fieldsToReveal.revealTemperament &&
    (frog.jump !== undefined) === fieldsToReveal.revealJump &&
    (frog.speed !== undefined) === fieldsToReveal.revealSpeed &&
    (frog.intelligence !== undefined) === fieldsToReveal.revealIntelligence &&
    (frog.beauty !== undefined) === fieldsToReveal.revealBeauty &&
    (frog.timestampSigned !== undefined) ===
      fieldsToReveal.revealTimestampSigned &&
    (frog.ownerSemaphoreId !== undefined) ===
      fieldsToReveal.revealOwnerSemaphoreId &&
    (pcd.claim.nullifierHash !== undefined) === revealNullifierHash;

  return sameExternalNullifier && sameWatermark && sameFieldsToReveal;
}
