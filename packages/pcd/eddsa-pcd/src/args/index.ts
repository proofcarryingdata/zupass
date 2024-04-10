import { StringArgument, StringArrayArgument } from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link EdDSAPCD}.
 */
export const EdDSAPCDTypeName = "eddsa-pcd";

/**
 * Defines the essential parameters required for creating an {@link EdDSAPCD}.
 */
export type EdDSAPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * The message is composed of a list of stringified big integers so that both `proof` and `claim`
   * can also be used within SNARK circuits, which operate on fields that are themselves big integers.
   */
  message: StringArrayArgument;

  /**
   * A string that uniquely identifies an {@link EdDSAPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};
