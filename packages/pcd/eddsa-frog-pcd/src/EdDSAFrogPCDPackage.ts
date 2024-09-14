import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import isEqual from "lodash/isEqual";
import { v4 as uuid } from "uuid";
import {
  EdDSAFrogPCD,
  EdDSAFrogPCDArgs,
  EdDSAFrogPCDClaim,
  EdDSAFrogPCDProof,
  EdDSAFrogPCDTypeName
} from "./EdDSAFrogPCD";
import { frogDataToBigInts, getEdDSAFrogData } from "./utils";

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
    isEqual(messageDerivedFromClaim, pcd.proof.eddsaPCD.claim.message) &&
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
