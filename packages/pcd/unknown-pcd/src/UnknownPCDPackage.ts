import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import {
  UnknownPCD,
  UnknownPCDArgs,
  UnknownPCDClaim,
  UnknownPCDInitArgs,
  UnknownPCDProof,
  UnknownPCDTypeName
} from "./UnknownPCD";

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

  // TODO(artwyman): Think harder about this.  There's no way to reliably
  // extract the proper ID from the SerializedPCD, so it's not going to be
  // consistent in the PCDCollection.  We could make a best-effort attempt
  // using JSON and/or JSONBig deserialization to look for an "id" field.
  // We could also change SerializedPCD going forward to contain an "id"
  // field, but it would have to be optional.
  const id = uuid();

  return new UnknownPCD(id, args.serializedPCD.value, undefined);
}

/**
 * Verifies an UnknownPCD.  Since the validity of the opaque serializedPCD
 * is not known, the result of this function instead depends on the
 * behavior configuredin the {@link UnknownPCDInitArgs}.
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

  if (pcd.proof.error !== undefined) {
    throw pcd.proof.error;
  }
  throw new Error(
    `UnknownPCD wrapping "${pcd.claim.serializedPCD.type}" cannot be validated.`
  );
}

/**
 * Serializes a {@link UnknownPCD}, which results in the wrapped serialized
 * PCD in its original form, with its original type.
 *
 * @param pcd The POD PCD to be serialized.
 * @returns The serialized version of the POD PCD.
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
  return {
    header: "Unknown PCD",
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
