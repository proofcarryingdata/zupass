import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import _ from "lodash";
import { v4 as uuid } from "uuid";
import { frogDataToBigInts, getEdDSAFrogData } from "./utils";

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
 * Creates a new {@link EdDSAFrogPCD} by generating an {@link EdDSAFrogPCDProof}
 * and deriving an {@link EdDSAFrogPCDClaim} from the given {@link EdDSAFrogPCDArgs}.
 */
export async function prove(args: EdDSAFrogPCDArgs): Promise<EdDSAFrogPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.data.value) {
    throw new Error("missing data value");
  }

  const seralizedData = frogDataToBigInts(args.data.value);

  // Creates an EdDSA PCD where the message is a serialized data
  const eddsaPCD = await EdDSAPCDPackage.prove({
    message: {
      value: seralizedData.map((b) => b.toString()),
      argumentType: ArgumentTypeName.StringArray
    },
    privateKey: {
      value: args.privateKey.value,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  const id = args.id.value ?? uuid();

  return new EdDSAFrogPCD(id, { data: args.data.value }, { eddsaPCD });
}

/**
 * Verifies an EdDSA Frog PCD by checking that its {@link EdDSAFrogPCDClaim} corresponds to
 * its {@link EdDSAFrogPCDProof}. If they match, the function returns true, otherwise false.
 * In most cases, verifying the validity of the PCD with this function is not enough.
 * It may also be necessary to check the public key of the
 * entity that signed the claim and verify the authenticity of the entity.
 */
export async function verify(pcd: EdDSAFrogPCD): Promise<boolean> {
  const messageDerivedFromClaim = frogDataToBigInts(pcd.claim.data);

  return (
    _.isEqual(messageDerivedFromClaim, pcd.proof.eddsaPCD.claim.message) &&
    EdDSAPCDPackage.verify(pcd.proof.eddsaPCD)
  );
}

/**
 * Serializes an {@link EdDSAFrogPCD}.
 * @param pcd The EdDSA Frog PCD to be serialized.
 * @returns The serialized version of the EdDSA Frog PCD.
 */
export async function serialize(
  pcd: EdDSAFrogPCD
): Promise<SerializedPCD<EdDSAFrogPCD>> {
  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EdDSAFrogPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      data: pcd.claim.data
    })
  } as SerializedPCD<EdDSAFrogPCD>;
}

/**
 * Deserializes a serialized {@link EdDSAFrogPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the EdDSA Frog PCD.
 */
export async function deserialize(serialized: string): Promise<EdDSAFrogPCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new EdDSAFrogPCD(
    deserializedWrapper.id,
    { data: deserializedWrapper.data },
    { eddsaPCD: deserializedEdDSAPCD }
  );
}

/**
 * Provides the information about the {@link EdDSAFrogPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The EdDSA Frog PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: EdDSAFrogPCD): DisplayOptions {
  const frogData = getEdDSAFrogData(pcd);
  if (!frogData) {
    return {
      header: "Frog",
      displayName: "frog-" + pcd.id.substring(0, 4)
    };
  }

  return {
    displayName: `#${String(frogData.frogId).padStart(3, "00")} ${
      frogData.name
    }`
  };
}

/**
 * Returns true if a PCD is an EdDSA Ticket PCD, or false otherwise.
 */
export function isEdDSAFrogPCD(pcd: PCD): pcd is EdDSAFrogPCD {
  return pcd.type === EdDSAFrogPCDTypeName;
}

/**
 * The PCD package of the EdDSA Ticket PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const EdDSAFrogPCDPackage: PCDPackage<
  EdDSAFrogPCDClaim,
  EdDSAFrogPCDProof,
  EdDSAFrogPCDArgs
> = {
  name: EdDSAFrogPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
