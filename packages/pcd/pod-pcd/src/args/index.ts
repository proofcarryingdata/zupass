import { ObjectArgument, StringArgument } from "@pcd/pcd-types";
import { PODEntries } from "@pcd/pod";

/**
 * The globally unique type name of the {@link PODPCD}.
 */
export const PODPCDTypeName = "pod-pcd";

/**
 * Defines the essential parameters required for creating a {@link PODPCD}.
 */
export type PODPCDArgs = {
  /**
   * A {@link ITicketData} object containing ticket information that is encoded into this PCD.
   */
  entries: ObjectArgument<PODEntries>;
  // TODO(POD-P2): Figure out serializable format here.  ObjectArgument is
  // intended to be directly JSON serializable, so can't contain bigints
  // if used for network requests (e.g. ProveAndAdd).  The choice here should
  // be driven by the needs of the Prove screen.

  /**
   * The signer's EdDSA private key.  This is a 32-byte value used to sign the
   * message.  {@link newEdDSAPrivateKey} is recommended for generating highly
   * secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A string that uniquely identifies an {@link PODPCD}. If this argument is
   * not specified a random id will be generated.
   *
   * This ID is not cryptographically verified by the POD.  An issuer can choose
   * to include the ID in an entry of the POD to do so, but this PCD type
   * doesn't link its ID to any such entry.
   */
  id: StringArgument;
};
