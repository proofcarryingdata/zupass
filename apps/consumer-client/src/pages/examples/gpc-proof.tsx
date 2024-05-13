import {
  GPCBoundConfig,
  deserializeGPCProofConfig,
  gpcBindConfig,
  serializeGPCBoundConfig
} from "@pcd/gpc";
import { GPCPCD, GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
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
import { ZUPASS_URL } from "../../constants";
import { EXAMPLE_GPC_CONFIG } from "../../podExampleConstants";

export default function Page(): JSX.Element {
  const [externalNullifier, setExternalNullifier] = useState(
    "example external nullifier"
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
              proofConfig,
              emptyStrToUndefined(watermark),
              emptyStrToUndefined(externalNullifier)
            )
          }
          disabled={valid}
        >
          Request Zupass GPC Proof
        </button>
        <br />
        GPC Proof Configuration:
        <textarea
          cols={45}
          rows={12}
          value={proofConfig}
          onChange={(e): void => {
            setProofConfig(e.target.value);
          }}
        />
        <br />
        External Nullifier (or empty for none):
        <textarea
          value={externalNullifier}
          onChange={(e): void => {
            setExternalNullifier(e.target.value);
          }}
        />
        <br />
        Watermark (or empty for none):
        <textarea
          value={watermark}
          onChange={(e): void => {
            setWatermark(e.target.value);
          }}
        />
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
                {pcd.claim.revealed.owner?.nullifierHash && (
                  <p>{`Nullifier Hash: ${pcd.claim.revealed.owner?.nullifierHash}`}</p>
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
 * @param proofConfig Stringified GPCProofConfig
 * @param watermark Challenge to watermark this proof to
 * @param externalNullifier Optional unique identifier for this GPCPCD
 */
export function openGPCPopup(
  urlToZupassWebsite: string,
  popupUrl: string,
  proofConfig: string,
  watermark?: string,
  externalNullifier?: string
): void {
  const args: GPCPCDArgs = {
    proofConfig: {
      argumentType: ArgumentTypeName.String,
      value: proofConfig,
      userProvided: false
    },
    pod: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: PODPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        notFoundMessage: "No eligible PODs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.String,
      value: externalNullifier,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.String,
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
      title: "GPC Proof",
      description: "gpc pcd request"
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
  watermark?: string,
  externalNullifier?: string
): { pcd: GPCPCD | undefined; error: Error | undefined } {
  const [error, _setError] = useState<Error | undefined>();
  const gpcPCD = useSerializedPCD(GPCPCDPackage, pcdStr);

  useEffect(() => {
    if (gpcPCD) {
      verifyProof(gpcPCD, proofConfig, watermark, externalNullifier).then(
        (info) => onVerified(info.valid, info.err)
      );
    }
  }, [gpcPCD, proofConfig, watermark, externalNullifier, onVerified]);

  return {
    pcd: gpcPCD,
    error
  };
}

async function verifyProof(
  pcd: GPCPCD,
  proofConfig: string,
  watermark?: string,
  externalNullifier?: string
): Promise<{ valid: boolean; err?: string }> {
  const { init, verify } = GPCPCDPackage;
  await init?.({
    zkArtifactPath:
      "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/artwyman/experimental/packages/proto-pod-gpc"
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
  try {
    localBoundConfig = gpcBindConfig(
      deserializeGPCProofConfig(proofConfig)
    ).boundConfig;
  } catch (configError) {
    return { valid: false, err: "Invalid proof config." };
  }
  const sameConfig = _.isEqual(localBoundConfig, pcd.claim.config);
  if (!sameConfig) {
    return { valid: false, err: "Config does not match." };
  }

  return { valid: true };
}
