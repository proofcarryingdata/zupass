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
import { EmailCardBody } from "./CardBody";
import { emailDataToBigInts, getEmailData } from "./utils";

export const EmailPCDTypeName = "email-pcd";

export interface EmailPCDInitArgs {}

export interface IEmailData {
  emailAddress: string;
}

// Nothing to do other than to ensure that our dependency is initialized
async function init(_args: EmailPCDInitArgs): Promise<void> {
  EdDSAPCDPackage.init?.({});
}

export interface EmailPCDArgs {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // ticket information that is encoded into this pcd
  email: ObjectArgument<IEmailData>;
  // A unique string identifying the PCD
  id: StringArgument;
}

export interface EmailPCDClaim {
  email: IEmailData;
}

export interface EmailPCDProof {
  eddsaPCD: EdDSAPCD; // eddsa signature of {@link EmailPCDClaim.email}
}

export class EmailPCD implements PCD<EmailPCDClaim, EmailPCDProof> {
  type = EmailPCDTypeName;
  claim: EmailPCDClaim;
  proof: EmailPCDProof;
  id: string;

  public constructor(id: string, claim: EmailPCDClaim, proof: EmailPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: EmailPCDArgs): Promise<EmailPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.email.value) {
    throw new Error("missing email value");
  }

  const serializedEmail = emailDataToBigInts(args.email.value);

  const eddsaPCD = await EdDSAPCDPackage.prove({
    message: {
      value: serializedEmail.map((b) => b.toString()),
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

  return new EmailPCD(id, { email: args.email.value }, { eddsaPCD });
}

export async function verify(pcd: EmailPCD): Promise<boolean> {
  const messageDerivedFromClaim = emailDataToBigInts(pcd.claim.email);

  if (!_.isEqual(messageDerivedFromClaim, pcd.proof.eddsaPCD.claim.message)) {
    throw new Error(`email data does not match proof`);
  }

  try {
    const valid = await EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: EmailPCD
): Promise<SerializedPCD<EmailPCD>> {
  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EmailPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      email: pcd.claim.email
    })
  } as SerializedPCD<EmailPCD>;
}

export async function deserialize(serialized: string): Promise<EmailPCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new EmailPCD(
    deserializedWrapper.id,
    { email: deserializedWrapper.email },
    { eddsaPCD: deserializedEdDSAPCD }
  );
}

export function getDisplayOptions(pcd: EmailPCD): DisplayOptions {
  const emailData = getEmailData(pcd);
  if (!emailData) {
    return {
      header: "Attested email",
      displayName: "email-" + pcd.id.substring(0, 4)
    };
  }

  return {
    header: "Attested email",
    displayName: emailData.emailAddress
  };
}

/**
 * PCD-conforming wrapper to sign messages using an EdDSA keypair,
 * representing an attested email.
 */
export const EmailPCDPackage: PCDPackage<
  EmailPCDClaim,
  EmailPCDProof,
  EmailPCDArgs,
  EmailPCDInitArgs
> = {
  name: EmailPCDTypeName,
  renderCardBody: EmailCardBody,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
