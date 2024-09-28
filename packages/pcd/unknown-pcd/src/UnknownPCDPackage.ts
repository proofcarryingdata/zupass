import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import {
  UnknownPCD,
  UnknownPCDArgs,
  UnknownPCDClaim,
  UnknownPCDInitArgs,
  UnknownPCDProof,
  UnknownPCDTypeName
} from "./UnknownPCD";
import { derivePCDID } from "./wrapUnknown";

let savedInitArgs: UnknownPCDInitArgs = undefined;

/**
 * Initialize UnknownPCDPackage with configuration
 */
export async function init(args: UnknownPCDInitArgs): Promise<void> {
  savedInitArgs = args;
}

/**
 * Creates a new {@link UnknownPCD} by generating an {@link UnknownPCDProof}
 * and deriving an {@link UnknownPCDClaim} from the given {@link UnknownPCDArgs}.
 *
 * @throws if the arguments are invalid
 */
export async function prove(args: UnknownPCDArgs): Promise<UnknownPCD> {
  if (!args.serializedPCD.value) {
    throw new Error("No serialized PCD value provided");
  }

  const id = derivePCDID(args.serializedPCD.value);

  return new UnknownPCD(id, args.serializedPCD.value, undefined);
}

/**
 * Verifies an UnknownPCD.  Since the validity of the opaque serializedPCD
 * is not known, the result of this function instead depends on the
 * behavior configured in the {@link UnknownPCDInitArgs}.
 */
export async function verify(pcd: UnknownPCD): Promise<boolean> {
  const behavior = savedInitArgs?.verifyBehavior || "error";
  switch (behavior) {
    case "valid":
      return true;
    case "invalid":
      return false;
    case "error":
      break;
  }

  if (pcd.claim.error !== undefined) {
    throw pcd.claim.error;
  }
  throw new Error(
    `UnknownPCD wrapping "${pcd.claim.serializedPCD.type}" cannot be validated.`
  );
}

/**
 * Serializes a {@link UnknownPCD}, which results in the wrapped serialized
 * PCD in its original form, with its original type.
 *
 * @param pcd The PCD to be serialized.
 * @returns The serialized version of the PCD.
 */
export async function serialize(pcd: UnknownPCD): Promise<SerializedPCD> {
  return pcd.claim.serializedPCD;
}

/**
 * Deserializes a serialized {@link UnknownPCD}.  Should never be called
 * in normal usage, and will always throw.
 *
 * @param _serialized The serialized PCD to deserialize.
 * @returns never
 * @throws an error
 */
export async function deserialize(_serialized: string): Promise<UnknownPCD> {
  throw new Error("UnknownPCD cannot be deserialized.");
}

/**
 * Provides the information about the {@link UnknownPCD} that will be displayed
 * to users on Zupass.
 *
 * @param pcd The UnknownPCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: UnknownPCD): DisplayOptions {
  function shortenPCDType(pcdType: string): string {
    if (pcdType.endsWith("-pcd")) {
      return pcdType.slice(0, pcdType.length - "-pcd".length);
    }
    return pcdType;
  }

  const displayType = shortenPCDType(pcd.claim.serializedPCD.type);
  return {
    header: `Unknown ${displayType}`,
    displayName: "unknown-" + pcd.claim.serializedPCD.type
  };
}

/**
 * The PCD package of the UnknownPCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const UnknownPCDPackage: PCDPackage<
  UnknownPCDClaim,
  UnknownPCDProof,
  UnknownPCDArgs,
  UnknownPCDInitArgs
> = {
  name: UnknownPCDTypeName,
  init,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
