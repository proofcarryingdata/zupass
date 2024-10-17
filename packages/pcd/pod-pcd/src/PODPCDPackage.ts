import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { POD } from "@pcd/pod";
import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  PODPCD,
  PODPCDArgs,
  PODPCDClaim,
  PODPCDInitArgs,
  PODPCDProof,
  PODPCDTypeName
} from "./PODPCD";
import { getTitleEntry } from "./utils";

/**
 * Creates a new {@link PODPCD} by generating an {@link PODPCDProof}
 * and deriving an {@link PODPCDClaim} from the given {@link PODPCDArgs}.
 *
 * @throws if the arguments are invalid
 */
export async function prove(args: PODPCDArgs): Promise<PODPCD> {
  if (!args.privateKey.value) throw new Error("No private key value provided");
  if (!args.entries.value) throw new Error("No POD entries value provided");
  const id = typeof args.id.value === "string" ? args.id.value : uuid();

  const pod = POD.sign(args.entries.value, args.privateKey.value);
  return new PODPCD(id, pod);
}

/**
 * Verifies a POD PCD by checking that its {@link PODPCDClaim} corresponds to
 * its {@link PODPCDProof}.  If the signature is valid and matches the entries,
 * the function returns true, otherwise false.
 */
export async function verify(pcd: PODPCD): Promise<boolean> {
  return pcd.pod.verifySignature();
}

/**
 * Serializes a {@link PODPCD}.
 * @param pcd The POD PCD to be serialized.
 * @returns The serialized version of the POD PCD.
 */
export async function serialize(pcd: PODPCD): Promise<SerializedPCD<PODPCD>> {
  return {
    type: PODPCDTypeName,
    pcd: JSONBig({
      useNativeBigInt: true,
      alwaysParseAsBig: true
    }).stringify({
      id: pcd.id,
      claim: pcd.claim,
      proof: pcd.proof
    })
  };
}

/**
 * Deserializes a serialized {@link PODPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the POD PCD.
 */
export async function deserialize(serialized: string): Promise<PODPCD> {
  const deserialized = JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(serialized);

  // TODO(POD-P2): More careful schema validation, likely with Zod, with
  // special handling of the PODEntries type and subtypes.
  // TODO(POD-P3): Backward-compatible schema versioning.
  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(deserialized.claim.entries, "entries");
  requireDefinedParameter(
    deserialized.claim.signerPublicKey,
    "signerPublicKey"
  );
  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.signature, "signature");

  const loadedPOD = POD.load(
    deserialized.claim.entries,
    deserialized.proof.signature,
    deserialized.claim.signerPublicKey
  );

  return new PODPCD(deserialized.id, loadedPOD);
}

/**
 * Provides the information about the {@link PODPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The POD PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(
  // TODO(ichub): Figure out why this is the only case where using PODPCD directly doesn't work.
  // What's the right approach to PCD classes which want extra private or public
  // data outside of claim + proof?
  pcd: PCD<PODPCDClaim, PODPCDProof>
): DisplayOptions {
  const titleEntry = getTitleEntry(pcd);
  if (titleEntry?.type === "string" && titleEntry.value.length > 0) {
    return {
      header: titleEntry.value,
      displayName: "pod-" + titleEntry.value
    };
  }

  return {
    header: "POD",
    displayName: "pod-" + pcd.id
  };
}

/**
 * The PCD package of the POD PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const PODPCDPackage: PCDPackage<
  PODPCDClaim,
  PODPCDProof,
  PODPCDArgs,
  PODPCDInitArgs
> = {
  name: PODPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
