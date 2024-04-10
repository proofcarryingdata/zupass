import { EdDSAPCD } from "@pcd/eddsa-pcd";
import {
  ObjectArgument,
  PCD,
  StringArgument
} from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link EdDSAFrogPCD}.
 */
export const EdDSAFrogPCDTypeName = "eddsa-frog-pcd";

/**
 * Assigns each currently supported Biome a unique value.
 */
export enum Biome {
  Unknown,
  Jungle,
  Desert,
  Swamp,
  TheCapital,
  PutridSwamp,
  CelestialPond,
  TheWrithingVoid
}

/**
 * Assigns each currently supported Rarity a unique value.
 */
export enum Rarity {
  Unknown,
  Common,
  Rare,
  Epic,
  Legendary,
  Mythic,
  Object
}

/**
 * Assigns each currently supported Temperament a unique value.
 */
export enum Temperament {
  UNKNOWN, // ???
  N_A, // N/A
  ANGY,
  BORD,
  CALM,
  CHUB,
  COOL,
  DARK,
  DOOM,
  HMBL,
  HNGY,
  HRNY,
  HYPE,
  MEOW,
  OKAY,
  PUFF,
  SADG,
  SLLY,
  SLPY,
  WISE,
  WOW,
  YOLO
}

export const COMMON_TEMPERAMENT_SET = [
  Temperament.HNGY,
  Temperament.ANGY,
  Temperament.SADG,
  Temperament.CALM,
  Temperament.BORD,
  Temperament.DARK,
  Temperament.SLPY,
  Temperament.CALM
];

/**
 * FROGCRYPTO Data Model
 */
export interface IFrogData {
  // The fields below are not signed and are used for display purposes.
  name: string;
  description: string;
  imageUrl: string;
  // The fields below are signed using the passport-server's private EdDSA key.
  frogId: number;
  biome: Biome;
  rarity: Rarity;
  temperament: Temperament;
  jump: number;
  speed: number;
  intelligence: number;
  beauty: number;
  timestampSigned: number;
  ownerSemaphoreId: string;
}

/**
 * Defines the essential parameters required for creating an {@link EdDSAFrogPCD}.
 */
export type EdDSAFrogPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A {@link IFrogData} object containing data that is encoded into this PCD.
   */
  data: ObjectArgument<IFrogData>;

  /**
   * A string that uniquely identifies an {@link EdDSAFrogPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

/**
 * Defines the EdDSA Frog PCD claim. The claim contains data that was signed
 * with the private key corresponding to the given public key stored in the proof.
 */
export interface EdDSAFrogPCDClaim {
  data: IFrogData;
}

/**
 * Defines the EdDSA Frog PCD proof. The proof is an EdDSA PCD whose message
 * is the encoded data.
 */
export interface EdDSAFrogPCDProof {
  eddsaPCD: EdDSAPCD;
}

/**
 * The EdDSA Frog PCD enables the verification that a specific  {@link EdDSAFrogPCDClaim}
 * has been signed with an EdDSA private key. The {@link EdDSAFrogPCDProof} contains a EdDSA
 * PCD and serves as the signature.
 */
export class EdDSAFrogPCD implements PCD<EdDSAFrogPCDClaim, EdDSAFrogPCDProof> {
  type = EdDSAFrogPCDTypeName;
  claim: EdDSAFrogPCDClaim;
  proof: EdDSAFrogPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EdDSAFrogPCDClaim,
    proof: EdDSAFrogPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}



/**
 * Returns true if a PCD is an EdDSA Ticket PCD, or false otherwise.
 */
export function isEdDSAFrogPCD(pcd: PCD): pcd is EdDSAFrogPCD {
  return pcd.type === EdDSAFrogPCDTypeName;
}
