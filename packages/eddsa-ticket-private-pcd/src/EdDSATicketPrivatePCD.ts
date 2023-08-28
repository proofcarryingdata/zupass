import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  booleanToBigInt,
  ticketDataToBigInts,
  uuidToBigInt
} from "@pcd/eddsa-ticket-pcd";
import {
  BigIntArgument,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  STATIC_SIGNATURE_PCD_NULLIFIER,
  generateMessageHash
} from "@pcd/semaphore-signature-pcd";
import { BabyJub, Eddsa, buildBabyjub, buildEddsa } from "circomlibjs";
import JSONBig from "json-bigint";
import { groth16 } from "snarkjs";
import { v4 as uuid } from "uuid";
import vkey from "../artifacts/verification_key.json";
import {
  decStringToBigIntToUuid,
  fromHexString,
  isNegativeOne
} from "./utils/utils";

export const STATIC_TICKET_PCD_NULLIFIER = generateMessageHash(
  "dummy-nullifier-for-eddsa-ticket-pcds"
);

export const EdDSATicketPrivatePCDTypeName = "eddsa-ticket-private-pcd";

let babyJub: BabyJub;
let eddsa: Eddsa;
let initArgs: EdDSATicketPrivatePCDInitArgs | undefined = undefined;

export interface EdDSATicketFieldsRequest {
  revealTicketId: boolean;
  revealEventId: boolean;
  revealProductId: boolean;
  revealTimestampConsumed: boolean;
  revealTimestampSigned: boolean;
  revealAttendeeSemaphoreId: boolean;
  revealIsConsumed: boolean;
  revealIsRevoked: boolean;
}

export interface EdDSATicketPrivatePCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

export interface EdDSATicketPrivatePCDArgs {
  // generally, `ticket` and `identity` are user-provided
  ticket: PCDArgument<EdDSATicketPCD>;
  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `fieldsRequested`, `externalNullifier`, `watermark` are usually app-specified
  fieldsRequested: ObjectArgument<EdDSATicketFieldsRequest>;
  watermark: BigIntArgument;

  // provide externalNullifier field to request a nullifierHash
  // if you don't provide this field, no nullifierHash will be outputted
  externalNullifier?: BigIntArgument;
}

export interface EdDSATicketPrivatePCDClaim {
  partialTicket: Partial<ITicketData>;
  watermark: string;
  signer: EDdSAPublicKey; // in montgomery form. must use F.toObject() from ffjavascript to convert to raw coords

  // only if requested in PCDArgs
  externalNullifier?: string;
  nullifierHash?: string;
}

export interface EdDSATicketPrivatePCDProof {
  proof: any;
}

export class EdDSATicketPrivatePCD
  implements PCD<EdDSATicketPrivatePCDClaim, EdDSATicketPrivatePCDProof>
{
  type = EdDSATicketPrivatePCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: EdDSATicketPrivatePCDClaim,
    readonly proof: EdDSATicketPrivatePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: EdDSATicketPrivatePCDInitArgs) {
  initArgs = args;
  babyJub = await buildBabyjub();
  eddsa = await buildEddsa();
}

export async function prove(
  args: EdDSATicketPrivatePCDArgs
): Promise<EdDSATicketPrivatePCD> {
  if (!initArgs) {
    throw new Error("Cannot make proof: init has not been called yet");
  }

  const serializedTicketPCD = args.ticket.value?.pcd;
  if (!serializedTicketPCD) {
    throw new Error("Cannot make proof: missing ticket PCD");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("Cannot make proof: missing identity PCD");
  }

  const dataRequestObj = args.fieldsRequested.value;
  if (!dataRequestObj) {
    throw new Error("Cannot make proof: missing fields request object");
  }

  if (!args.watermark.value) {
    throw new Error("Cannot make proof: missing watermark");
  }

  if (
    args.externalNullifier !== undefined &&
    args.externalNullifier.value !== undefined &&
    BigInt(args.externalNullifier.value) === STATIC_SIGNATURE_PCD_NULLIFIER
  ) {
    throw new Error(
      "Cannot make proof: same externalNullifier as SemaphoreSignaturePCD, which would break anonymity"
    );
  }

  const deserializedTicket =
    await EdDSATicketPCDPackage.deserialize(serializedTicketPCD);

  const ticketAsBigIntArray = ticketDataToBigInts(
    deserializedTicket.claim.ticket
  );

  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  const pubKey = deserializedTicket.proof.eddsaPCD.claim.publicKey;

  const rawSig = eddsa.unpackSignature(
    fromHexString(deserializedTicket.proof.eddsaPCD.proof.signature)
  );

  const snarkInput = {
    ticketId: ticketAsBigIntArray[0].toString(),
    revealTicketId: !!dataRequestObj.revealTicketId ? "1" : "0",
    eventId: ticketAsBigIntArray[1].toString(),
    revealEventId: !!dataRequestObj.revealEventId ? "1" : "0",
    productId: ticketAsBigIntArray[2].toString(),
    revealProductId: !!dataRequestObj.revealProductId ? "1" : "0",
    timestampConsumed: ticketAsBigIntArray[3].toString(),
    revealTimestampConsumed: !!dataRequestObj.revealTimestampConsumed
      ? "1"
      : "0",
    timestampSigned: ticketAsBigIntArray[4].toString(),
    revealTimestampSigned: !!dataRequestObj.revealTimestampSigned ? "1" : "0",
    attendeeSemaphoreId: ticketAsBigIntArray[5].toString(),
    revealAttendeeSemaphoreId: !!dataRequestObj.revealAttendeeSemaphoreId
      ? "1"
      : "0",
    isConsumed: ticketAsBigIntArray[6].toString(),
    revealIsConsumed: !!dataRequestObj.revealIsConsumed ? "1" : "0",
    isRevoked: ticketAsBigIntArray[7].toString(),
    revealIsRevoked: !!dataRequestObj.revealIsRevoked ? "1" : "0",
    externalNullifier:
      args.externalNullifier?.value || STATIC_TICKET_PCD_NULLIFIER.toString(),
    revealNullifierHash: !!args.externalNullifier ? "1" : "0",
    Ax: babyJub.F.toObject(fromHexString(pubKey[0])).toString(),
    Ay: babyJub.F.toObject(fromHexString(pubKey[1])).toString(),
    R8x: babyJub.F.toObject(rawSig.R8[0]).toString(),
    R8y: babyJub.F.toObject(rawSig.R8[1]).toString(),
    S: rawSig.S.toString(),
    identityNullifier: identityPCD.claim.identity.getNullifier().toString(),
    identityTrapdoor: identityPCD.claim.identity.getTrapdoor().toString(),
    watermark: BigInt(args.watermark.value).toString()
  };

  const { proof, publicSignals } = await groth16.fullProve(
    snarkInput,
    initArgs.wasmFilePath,
    initArgs.zkeyFilePath
  );

  const partialTicket: Partial<ITicketData> = {};
  if (!isNegativeOne(publicSignals[0])) {
    partialTicket.ticketId = decStringToBigIntToUuid(publicSignals[0]);
  }
  if (!isNegativeOne(publicSignals[1])) {
    partialTicket.eventId = decStringToBigIntToUuid(publicSignals[1]);
  }
  if (!isNegativeOne(publicSignals[2])) {
    partialTicket.productId = decStringToBigIntToUuid(publicSignals[2]);
  }
  if (!isNegativeOne(publicSignals[3])) {
    partialTicket.timestampConsumed = parseInt(publicSignals[3]);
  }
  if (!isNegativeOne(publicSignals[4])) {
    partialTicket.timestampSigned = parseInt(publicSignals[4]);
  }
  if (!isNegativeOne(publicSignals[5])) {
    partialTicket.attendeeSemaphoreId = publicSignals[5];
  }
  if (!isNegativeOne(publicSignals[6])) {
    partialTicket.isConsumed = publicSignals[6] !== "0";
  }
  if (!isNegativeOne(publicSignals[7])) {
    partialTicket.isRevoked = publicSignals[7] !== "0";
  }

  const claim: EdDSATicketPrivatePCDClaim = {
    partialTicket,
    watermark: args.watermark.value,
    signer: pubKey
  };

  if (!!args.externalNullifier) {
    claim.nullifierHash = publicSignals[8];
    claim.externalNullifier = args.externalNullifier.value?.toString();
  }

  return new EdDSATicketPrivatePCD(uuid(), claim, { proof });
}

function publicSignalsFromClaim(claim: EdDSATicketPrivatePCDClaim): string[] {
  const t = claim.partialTicket;
  const ret: string[] = [];

  const negOne =
    "21888242871839275222246405745257275088548364400416034343698204186575808495616";

  ret.push(!!t.ticketId ? uuidToBigInt(t.ticketId).toString() : negOne);
  ret.push(!!t.eventId ? uuidToBigInt(t.eventId).toString() : negOne);
  ret.push(!!t.productId ? uuidToBigInt(t.productId).toString() : negOne);
  ret.push(!!t.timestampConsumed ? t.timestampConsumed.toString() : negOne);
  ret.push(!!t.timestampSigned ? t.timestampSigned.toString() : negOne);
  ret.push(t.attendeeSemaphoreId || negOne);
  ret.push(!!t.isConsumed ? booleanToBigInt(t.isConsumed).toString() : negOne);
  ret.push(!!t.isRevoked ? booleanToBigInt(t.isRevoked).toString() : negOne);
  ret.push(claim.nullifierHash || negOne);

  // for some reason the public inputs to the circuit
  // show up in the order `externalNullifier, Ax, Ay, watermark`
  ret.push(
    claim.externalNullifier?.toString() ||
      STATIC_TICKET_PCD_NULLIFIER.toString()
  );
  ret.push(babyJub.F.toObject(fromHexString(claim.signer[0])).toString());
  ret.push(babyJub.F.toObject(fromHexString(claim.signer[1])).toString());

  ret.push(claim.watermark);

  return ret;
}

export async function verify(pcd: EdDSATicketPrivatePCD): Promise<boolean> {
  let publicSignals = publicSignalsFromClaim(pcd.claim);
  return groth16.verify(vkey, publicSignals, pcd.proof.proof);
}

export async function serialize(
  pcd: EdDSATicketPrivatePCD
): Promise<SerializedPCD<EdDSATicketPrivatePCD>> {
  return {
    type: EdDSATicketPrivatePCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<EdDSATicketPrivatePCD>;
}

export async function deserialize(
  serialized: string
): Promise<EdDSATicketPrivatePCD> {
  const parsed = JSONBig({ useNativeBigInt: true }).parse(serialized);
  const proof = parsed.proof;
  const claim = parsed.claim;
  return new EdDSATicketPrivatePCD(parsed.id, claim, proof);
}

/**
 * EdDSA Ticket Private PCD
 */
export const EdDSATicketPrivatePCDPackage: PCDPackage<
  EdDSATicketPrivatePCDClaim,
  EdDSATicketPrivatePCDProof,
  EdDSATicketPrivatePCDArgs,
  EdDSATicketPrivatePCDInitArgs
> = {
  name: EdDSATicketPrivatePCDTypeName,
  // getDisplayOptions,
  // renderCardBody: EdDSATicketPrivateCardBody,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
