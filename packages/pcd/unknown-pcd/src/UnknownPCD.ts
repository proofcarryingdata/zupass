import { ObjectArgument, PCD, SerializedPCD } from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link UnknownPCD}.
 */
export const UnknownPCDTypeName = "unknown-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 */
export type UnknownPCDInitArgs =
  | undefined
  | {
      /**
       * Indicates the default behavior for verifying a PCD.  Default
       * behavior if undefined is to throw an exception since UnknownPCD
       * doesn't know if the contained PCD is inherently valid or not.
       */
      verifyBehavior?: "valid" | "invalid" | "error";
    };

/**
 * Defines the essential parameters required for creating a {@link UnknownPCD}.
 */
export type UnknownPCDArgs = {
  /**
   * The serialized PCD contained in this UnknownPCD.
   */
  serializedPCD: ObjectArgument<SerializedPCD>;
};

/**
 * Defines the Unknown PCD's claim, which contains the wrapped PCD.
 */
export interface UnknownPCDClaim {
  /**
   * The serialized PCD wrapped by this UnknownPCD.
   */
  serializedPCD: SerializedPCD;

  /**
   * The deserialization error which lead to the creation of this
   * UnknownPCD wrapper.
   */
  error?: unknown;
}

/**
 * Defines the UnknownPCD proof, which contains private information
 * about the wrapped PCD.
 */
export interface UnknownPCDProof {}

/**
 * The UnknownPCD is a wrapper intended to wrap some other PCD which cannot be
 * properly deserialized into its normal PCD form.  The wrapper holds the
 * original data unchanged.
 *
 * When the wrapper is serialized again, it outputs the original serialized PCD
 * in its original form, with its original type.  This is a recovery
 * mechanism for bugs and compatibility problems, which allows the
 * data to be maintained so that it can be deserialized again later by
 * an updated version of code with fixes, or with a new PCD package.
 */
export class UnknownPCD implements PCD<UnknownPCDClaim, UnknownPCDProof> {
  type = UnknownPCDTypeName;
  claim: UnknownPCDClaim;
  proof: UnknownPCDProof;
  id: string;

  /**
   * Create an UnknownPCD to encapsulate the serialized PCD, optionally
   * including the caught deserialization error.
   */
  public constructor(
    id: string,
    serializedPCD: SerializedPCD,
    error?: unknown
  ) {
    this.id = id;
    this.claim = { serializedPCD, error };
    this.proof = {};
  }
}

/**
 * Convenience function for checking the type of a UnknownPCD.
 */
export function isUnknownPCD(pcd: PCD): pcd is UnknownPCD {
  return pcd.type === UnknownPCDTypeName;
}
