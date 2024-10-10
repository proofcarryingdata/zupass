import {
  GPCArtifactSource,
  GPCArtifactStability,
  GPCArtifactVersion,
  GPCBoundConfig,
  GPCProofConfig,
  JSONPODMembershipLists,
  deserializeGPCProofConfig,
  gpcArtifactDownloadURL,
  gpcBindConfig,
  membershipListsToSets,
  podMembershipListsFromJSON,
  serializeGPCBoundConfig
} from "@pcd/gpc";
import {
  GPCPCD,
  GPCPCDArgs,
  GPCPCDPackage,
  JSONFixedPODEntries,
  checkPODAgainstPrescribedSignerPublicKeys,
  checkPODEntriesAgainstPrescribedEntries,
  checkPrescribedEntriesAgainstProofConfig,
  checkPrescribedSignerPublicKeysAgainstProofConfig,
  fixedPODEntriesFromJSON
} from "@pcd/gpc-pcd";
import {
  constructZupassPcdGetRequestUrl,
  openZupassPopup,
  useSerializedPCD,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { emptyStrToUndefined } from "@pcd/util";
import JSONBig from "json-bigint";
import _ from "lodash";
import { useEffect, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { GPC_ARTIFACT_CONFIG, ZUPASS_URL } from "../../constants";
import {
  EXAMPLE_GPC_CONFIG,
  EXAMPLE_MEMBERSHIP_LISTS,
  EXAMPLE_PRESCRIBED_ENTRIES,
  EXAMPLE_PRESCRIBED_SIGNER_PUBLIC_KEYS
} from "../../podExampleConstants";

export default function Page(): JSX.Element {
  const [externalNullifier, setExternalNullifier] = useState(
    "example external nullifier"
  );
  const [membershipLists, setMembershipLists] = useState(
    EXAMPLE_MEMBERSHIP_LISTS
  );
  const [prescribedEntries, setPrescribedEntries] = useState(
    EXAMPLE_PRESCRIBED_ENTRIES
  );
  const [prescribedSignerPublicKeys, setPrescribedSignerPublicKeys] = useState(
    EXAMPLE_PRESCRIBED_SIGNER_PUBLIC_KEYS
  );
  const [watermark, setWatermark] = useState("example watermark");
  const [proofConfig, setProofConfig] = useState(EXAMPLE_GPC_CONFIG);

  // Populate PCD from either client-side or server-side proving using the Zupass popup
  const [pcdStr] = useZupassPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const [validationError, setValidationError] = useState<string | undefined>();
  const onVerified = (valid: boolean, err?: string): void => {
    setValid(valid);
    setValidationError(err);
  };

  const { pcd } = useGPCProof(
    pcdStr,
    onVerified,
    proofConfig,
    emptyStrToUndefined(membershipLists),
    emptyStrToUndefined(prescribedEntries),
    emptyStrToUndefined(prescribedSignerPublicKeys),
    emptyStrToUndefined(watermark),
    emptyStrToUndefined(externalNullifier)
  );

  return (
    <>
      <HomeLink />
      <h2>POD GPC Proof</h2>
      <p>
        This page shows a working example of an integration with Zupass which
        requests and verifies a proof that the user holds one or more POD
        (Provable Object Data) objects which satisfy a proof configuration. The
        ZK proof is generated using a GPC (General Purpose Circuit).
      </p>
      <p>
        The underlying PCD that this example uses is <code>GPCPCD</code>. You
        can find more documentation regarding this PCD{" "}
        <CodeLink file="/tree/main/packages/pcd/gpc-pcd">
          here on GitHub
        </CodeLink>{" "}
        .
      </p>
      <ExampleContainer>
        <button
          onClick={(): void =>
            openGPCPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              "Example GPC Proof",
              "This is a request for a GPC proof from the Zupass example client.",
              proofConfig,
              emptyStrToUndefined(membershipLists),
              emptyStrToUndefined(prescribedEntries),
              emptyStrToUndefined(prescribedSignerPublicKeys),
              emptyStrToUndefined(watermark),
              emptyStrToUndefined(externalNullifier)
            )
          }
          disabled={valid}
        >
          Request Zupass GPC Proof
        </button>
        <br />
        GPC Proof Configuration: <br />
        <textarea
          cols={45}
          rows={15}
          value={proofConfig}
          onChange={(e): void => {
            setProofConfig(e.target.value);
          }}
        />
        <br />
        Prescribed entries to filter which PODs user can select. These keys must
        be revealed in the configuration. (Use empty for none.)
        <textarea
          cols={45}
          rows={5}
          value={prescribedEntries}
          onChange={(e): void => {
            setPrescribedEntries(e.target.value);
          }}
        />
        <br />
        Prescribed public keys to filter which PODs user can select. These keys
        must be revealed in the configuration. (Use empty for none.)
        <textarea
          cols={45}
          rows={5}
          value={prescribedSignerPublicKeys}
          onChange={(e): void => {
            setPrescribedSignerPublicKeys(e.target.value);
          }}
        />
        <br />
        Membership list(s) (or empty for none):
        <textarea
          cols={45}
          rows={15}
          value={membershipLists}
          onChange={(e): void => {
            setMembershipLists(e.target.value);
          }}
        />
        <br />
        <label>
          External Nullifier (or empty for none):
          <input
            type="text"
            value={externalNullifier}
            placeholder="<none>"
            style={{ marginLeft: "16px", width: "200px" }}
            onChange={(e): void => {
              setExternalNullifier(e.target.value);
            }}
          />
        </label>
        <br />
        Watermark (or empty for none):
        <label>
          <input
            type="text"
            value={watermark}
            placeholder="<none>"
            style={{ marginLeft: "16px", width: "200px" }}
            onChange={(e): void => {
              setWatermark(e.target.value);
            }}
          />
        </label>
        <br />
        {!!pcd && (
          <>
            <p>Got GPC Proof from Zupass</p>
            <CollapsableCode
              code={JSONBig({ useNativeBigInt: true }).stringify(pcd, null, 2)}
            />
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid: ${validationError}</p>}
            {valid === true && (
              <>
                <p>✅ Proof is valid</p>
                <p>Proof configuration:</p>
                <CollapsableCode
                  code={serializeGPCBoundConfig(pcd.claim.config, 2)}
                />
                <p>Revealed PODs:</p>
                <CollapsableCode
                  code={JSONBig({ useNativeBigInt: true }).stringify(
                    pcd.claim.revealed.pods,
                    null,
                    2
                  )}
                />
                {pcd.claim.revealed.watermark && (
                  <p>{`Watermark: ${pcd.claim.revealed.watermark.value}`}</p>
                )}
                {pcd.claim.revealed.owner?.externalNullifier && (
                  <p>{`External Nullifier: ${pcd.claim.revealed.owner?.externalNullifier.value}`}</p>
                )}
                {pcd.claim.revealed.owner?.nullifierHashV3 && (
                  <p>{`Nullifier Hash: ${pcd.claim.revealed.owner?.nullifierHashV3}`}</p>
                )}
              </>
            )}
          </>
        )}
      </ExampleContainer>
    </>
  );
}

/**
 * Opens a Zupass popup to prove a GPC Proof of one or more PODs.
 *
 * @param urlToZupassWebsite URL of the Zupass website
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param proofConfig Stringified `GPCProofConfig`
 * @param membershipLists Stringified `PODMembershipLists`
 * @param prescribedEntries Stringified `PODEntryRecord`
 * @param watermark Challenge to watermark this proof to
 * @param externalNullifier Optional unique identifier for this `GPCPCD`
 */
export function openGPCPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  popupTitle: string,
  popupDescription: string,
  proofConfig: string,
  membershipLists?: string,
  prescribedEntries?: string,
  prescribedSignerPublicKeys?: string,
  watermark?: string,
  externalNullifier?: string
): void {
  // Validate JSON input by parsing locally before sending.
  let jsonMembershipLists: JSONPODMembershipLists | undefined = undefined;
  if (membershipLists) {
    jsonMembershipLists = JSON.parse(membershipLists);
    if (jsonMembershipLists !== undefined) {
      podMembershipListsFromJSON(jsonMembershipLists);
    }
  }
  let jsonPrescribedEntries: JSONFixedPODEntries | undefined = undefined;
  if (prescribedEntries) {
    jsonPrescribedEntries = JSON.parse(prescribedEntries);
    if (jsonPrescribedEntries !== undefined) {
      fixedPODEntriesFromJSON(jsonPrescribedEntries);
    }
  }

  const args: GPCPCDArgs = {
    proofConfig: {
      argumentType: ArgumentTypeName.String,
      value: proofConfig,
      userProvided: false
    },
    pods: {
      argumentType: ArgumentTypeName.RecordContainer,
      value: {
        examplePOD: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: PODPCDPackage.name,
          value: undefined,
          userProvided: true,
          displayName: "Example POD"
        },
        cardPOD: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: PODPCDPackage.name,
          value: undefined,
          userProvided: true,
          displayName: "Card POD"
        }
      },
      validatorParams: {
        proofConfig,
        membershipLists: jsonMembershipLists,
        prescribedEntries: jsonPrescribedEntries,
        prescribedSignerPublicKeys:
          prescribedSignerPublicKeys !== undefined
            ? JSON.parse(prescribedSignerPublicKeys)
            : undefined
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.Object,
      value: externalNullifier,
      userProvided: false
    },
    membershipLists: {
      argumentType: ArgumentTypeName.Object,
      value: jsonMembershipLists,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.Object,
      value: watermark,
      userProvided: false
    }
  };

  const proofUrl = constructZupassPcdGetRequestUrl<typeof GPCPCDPackage>(
    urlToZupassWebsite,
    popupUrl,
    GPCPCDPackage.name,
    args,
    {
      genericProveScreen: true,
      title: popupTitle,
      description: popupDescription
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a GPC ticket proof.
 */
function useGPCProof(
  pcdStr: string,
  onVerified: (valid: boolean, err: string | undefined) => void,
  proofConfig: string,
  membershipLists?: string,
  prescribedEntries?: string,
  prescribedSignerPublicKeys?: string,
  watermark?: string,
  externalNullifier?: string
): { pcd: GPCPCD | undefined; error: Error | undefined } {
  const [error, _setError] = useState<Error | undefined>();
  const gpcPCD = useSerializedPCD(GPCPCDPackage, pcdStr);

  useEffect(() => {
    if (gpcPCD) {
      verifyProof(
        gpcPCD,
        proofConfig,
        membershipLists,
        prescribedEntries,
        prescribedSignerPublicKeys,
        watermark,
        externalNullifier
      ).then((info) => onVerified(info.valid, info.err));
    }
  }, [
    gpcPCD,
    proofConfig,
    membershipLists,
    prescribedEntries,
    prescribedSignerPublicKeys,
    watermark,
    externalNullifier,
    onVerified
  ]);

  return {
    pcd: gpcPCD,
    error
  };
}

async function verifyProof(
  pcd: GPCPCD,
  proofConfig: string,
  membershipLists?: string,
  prescribedEntries?: string,
  prescribedSignerPublicKeys?: string,
  watermark?: string,
  externalNullifier?: string
): Promise<{ valid: boolean; err?: string }> {
  const { init, verify } = GPCPCDPackage;
  await init?.({
    zkArtifactPath: gpcArtifactDownloadURL(
      GPC_ARTIFACT_CONFIG.source as GPCArtifactSource,
      GPC_ARTIFACT_CONFIG.stability as GPCArtifactStability,
      GPC_ARTIFACT_CONFIG.version as GPCArtifactVersion,
      ZUPASS_URL
    )
  });
  const verified = await verify(pcd);
  if (!verified) return { valid: false };

  const sameExternalNullifier =
    pcd.claim.revealed.owner?.externalNullifier?.value === externalNullifier ||
    (!pcd.claim.revealed.owner?.externalNullifier && !externalNullifier);
  if (!sameExternalNullifier) {
    return { valid: false, err: "External nullifier does not match." };
  }

  const sameWatermark =
    pcd.claim.revealed.watermark?.value === watermark ||
    (!pcd.claim.revealed.watermark && !watermark);
  if (!sameWatermark) {
    return { valid: false, err: "Watermark does not match." };
  }

  let localBoundConfig: GPCBoundConfig;
  let localProofConfig: GPCProofConfig;
  try {
    localProofConfig = deserializeGPCProofConfig(proofConfig);
    localBoundConfig = gpcBindConfig(localProofConfig).boundConfig;
  } catch (configError) {
    return { valid: false, err: "Invalid proof config." };
  }
  const sameConfig = _.isEqual(localBoundConfig, pcd.claim.config);
  if (!sameConfig) {
    return { valid: false, err: "Config does not match." };
  }

  // Check for equality of membership lists as sets, since the elements are
  // sorted by hash before being fed into circuits.
  const sameMembershipLists = _.isEqual(
    membershipListsToSets(pcd.claim.revealed.membershipLists ?? {}),
    membershipLists === undefined
      ? {}
      : membershipListsToSets(
          podMembershipListsFromJSON(JSON.parse(membershipLists))
        )
  );
  if (!sameMembershipLists) {
    return { valid: false, err: "Membership lists do not match." };
  }

  // Check that revealed entries match up with prescribed entries.
  if (prescribedEntries !== undefined) {
    const params = { notFoundMessage: undefined };
    const deserialisedPrescribedEntries = fixedPODEntriesFromJSON(
      JSON.parse(prescribedEntries)
    );

    for (const podName of Object.keys(deserialisedPrescribedEntries)) {
      const revealedPODData = pcd.claim.revealed.pods[podName];
      if (
        !checkPrescribedEntriesAgainstProofConfig(
          podName,
          localProofConfig,
          deserialisedPrescribedEntries,
          params
        )
      ) {
        return {
          valid: false,
          err: params.notFoundMessage
        };
      } else if (
        !checkPODEntriesAgainstPrescribedEntries(
          podName,
          revealedPODData.entries ?? {},
          deserialisedPrescribedEntries
        )
      ) {
        return {
          valid: false,
          err: "Prescribed entries do not agree with revealed entries."
        };
      }
    }
  }

  // Check that revealed signers' public keys match up with prescribed signers' public keys.
  if (prescribedSignerPublicKeys !== undefined) {
    const deserialisedPrescribedSignerPublicKeys: Record<string, string> =
      JSON.parse(prescribedSignerPublicKeys);
    for (const podName of Object.keys(deserialisedPrescribedSignerPublicKeys)) {
      const revealedSignerPublicKey =
        pcd.claim.revealed.pods[podName]?.signerPublicKey;
      const params = { notFoundMessage: undefined };
      if (
        !checkPrescribedSignerPublicKeysAgainstProofConfig(
          podName,
          localProofConfig,
          deserialisedPrescribedSignerPublicKeys,
          params
        )
      ) {
        return {
          valid: false,
          err: params.notFoundMessage
        };
      } else if (revealedSignerPublicKey === undefined) {
        return {
          valid: false,
          err: "Signer's public key for POD ${podName} is prescribed but not revealed."
        };
      } else if (
        !checkPODAgainstPrescribedSignerPublicKeys(
          podName,
          revealedSignerPublicKey,
          deserialisedPrescribedSignerPublicKeys,
          params
        )
      ) {
        return {
          valid: false,
          err:
            params.notFoundMessage ??
            `Signer's public key for POD ${podName} does not agree with prescribed value.`
        };
      }
    }
  }

  return { valid: true };
}
