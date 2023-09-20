import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  ticketDataToBigInts
} from "@pcd/eddsa-ticket-pcd";
import {
  BigIntArgument,
  DisplayOptions,
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
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import {
  babyJubIsNegativeOne,
  booleanToBigInt,
  decStringToBigIntToUuid,
  fromHexString,
  generateSnarkMessageHash,
  numberToBigInt,
  uuidToBigInt
} from "@pcd/util";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../util/src/declarations/circomlibjs.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../util/src/declarations/snarkjs.d.ts" />
import { BabyJub, buildBabyjub, buildEddsa, Eddsa } from "circomlibjs";
import JSONBig from "json-bigint";
import { groth16 } from "snarkjs";
import { v4 as uuid } from "uuid";
import vkey from "../artifacts-unsafe/verification_key.json";

import {} from "@pcd/util";
import { ZKEdDSATicketCardBody } from "./CardBody";

export const STATIC_TICKET_PCD_NULLIFIER = generateSnarkMessageHash(
  "dummy-nullifier-for-eddsa-ticket-pcds"
);

export const ZKEdDSATicketPCDTypeName = "zk-eddsa-ticket-pcd";

let initializedPromise: Promise<void> | undefined;
let babyJub: BabyJub;
let eddsa: Eddsa;
let initArgs: ZKEdDSATicketPCDInitArgs | undefined = undefined;

export interface EdDSATicketFieldsToReveal {
  revealTicketId?: boolean;
  revealEventId?: boolean;
  revealProductId?: boolean;
  revealTimestampConsumed?: boolean;
  revealTimestampSigned?: boolean;
  revealAttendeeSemaphoreId?: boolean;
  revealIsConsumed?: boolean;
  revealIsRevoked?: boolean;
  revealTicketCategory?: boolean;
  revealReservedSignedField1?: boolean;
  revealReservedSignedField2?: boolean;
  revealReservedSignedField3?: boolean;
}

export interface ZKEdDSATicketPCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

export interface ZKEdDSATicketPCDArgs {
  // generally, `ticket` and `identity` are user-provided
  ticket: PCDArgument<EdDSATicketPCD>;
  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `fieldsToReveal`, `externalNullifier`, `watermark` are usually app-specified
  fieldsToReveal: ObjectArgument<EdDSATicketFieldsToReveal>;
  watermark: BigIntArgument;

  // provide externalNullifier field to request a nullifierHash
  // if you don't provide this field, no nullifierHash will be outputted
  externalNullifier: BigIntArgument;
}

export interface ZKEdDSATicketPCDClaim {
  partialTicket: Partial<ITicketData>;
  watermark: string;
  signer: EDdSAPublicKey; // in montgomery form. must use F.toObject() from ffjavascript to convert to raw coords

  // only if requested in PCDArgs
  externalNullifier?: string;
  nullifierHash?: string;
}

// snarkjs proof
export interface ZKEdDSATicketPCDProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

export class ZKEdDSATicketPCD
  implements PCD<ZKEdDSATicketPCDClaim, ZKEdDSATicketPCDProof>
{
  type = ZKEdDSATicketPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSATicketPCDClaim,
    readonly proof: ZKEdDSATicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: ZKEdDSATicketPCDInitArgs) {
  initArgs = args;
}

async function ensureInitialized() {
  if (!initArgs) {
    throw new Error("missing init args");
  }

  if (!initializedPromise) {
    initializedPromise = (async () => {
      babyJub = await buildBabyjub();
      eddsa = await buildEddsa();
    })();
  }

  await initializedPromise;
}

export async function prove(
  args: ZKEdDSATicketPCDArgs
): Promise<ZKEdDSATicketPCD> {
  await ensureInitialized();

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

  const dataRequestObj = args.fieldsToReveal.value;
  if (!dataRequestObj) {
    throw new Error("Cannot make proof: missing fields request object");
  }

  if (!args.watermark.value) {
    throw new Error("Cannot make proof: missing watermark");
  }

  if (
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
    revealTicketId: dataRequestObj.revealTicketId ? "1" : "0",
    eventId: ticketAsBigIntArray[1].toString(),
    revealEventId: dataRequestObj.revealEventId ? "1" : "0",
    productId: ticketAsBigIntArray[2].toString(),
    revealProductId: dataRequestObj.revealProductId ? "1" : "0",
    timestampConsumed: ticketAsBigIntArray[3].toString(),
    revealTimestampConsumed: dataRequestObj.revealTimestampConsumed ? "1" : "0",
    timestampSigned: ticketAsBigIntArray[4].toString(),
    revealTimestampSigned: dataRequestObj.revealTimestampSigned ? "1" : "0",
    attendeeSemaphoreId: ticketAsBigIntArray[5].toString(),
    revealAttendeeSemaphoreId: dataRequestObj.revealAttendeeSemaphoreId
      ? "1"
      : "0",
    isConsumed: ticketAsBigIntArray[6].toString(),
    revealIsConsumed: dataRequestObj.revealIsConsumed ? "1" : "0",
    isRevoked: ticketAsBigIntArray[7].toString(),
    revealIsRevoked: dataRequestObj.revealIsRevoked ? "1" : "0",
    ticketCategory: ticketAsBigIntArray[8].toString(),
    revealTicketCategory: dataRequestObj.revealTicketCategory ? "1" : "0",
    reservedSignedField1: ticketAsBigIntArray[9].toString(),
    revealReservedSignedField1: dataRequestObj.revealReservedSignedField1
      ? "1"
      : "0",
    reservedSignedField2: ticketAsBigIntArray[10].toString(),
    revealReservedSignedField2: dataRequestObj.revealReservedSignedField2
      ? "1"
      : "0",
    reservedSignedField3: ticketAsBigIntArray[11].toString(),
    revealReservedSignedField3: dataRequestObj.revealReservedSignedField3
      ? "1"
      : "0",
    externalNullifier:
      args.externalNullifier.value || STATIC_TICKET_PCD_NULLIFIER.toString(),
    revealNullifierHash: args.externalNullifier.value ? "1" : "0",
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
  if (!babyJubIsNegativeOne(publicSignals[0])) {
    partialTicket.ticketId = decStringToBigIntToUuid(publicSignals[0]);
  }
  if (!babyJubIsNegativeOne(publicSignals[1])) {
    partialTicket.eventId = decStringToBigIntToUuid(publicSignals[1]);
  }
  if (!babyJubIsNegativeOne(publicSignals[2])) {
    partialTicket.productId = decStringToBigIntToUuid(publicSignals[2]);
  }
  if (!babyJubIsNegativeOne(publicSignals[3])) {
    partialTicket.timestampConsumed = parseInt(publicSignals[3]);
  }
  if (!babyJubIsNegativeOne(publicSignals[4])) {
    partialTicket.timestampSigned = parseInt(publicSignals[4]);
  }
  if (!babyJubIsNegativeOne(publicSignals[5])) {
    partialTicket.attendeeSemaphoreId = publicSignals[5];
  }
  if (!babyJubIsNegativeOne(publicSignals[6])) {
    partialTicket.isConsumed = publicSignals[6] !== "0";
  }
  if (!babyJubIsNegativeOne(publicSignals[7])) {
    partialTicket.isRevoked = publicSignals[7] !== "0";
  }
  if (!babyJubIsNegativeOne(publicSignals[8])) {
    partialTicket.ticketCategory = parseInt(publicSignals[8]);
  }
  if (!babyJubIsNegativeOne(publicSignals[9])) {
    partialTicket.reservedSignedField1 = parseInt(publicSignals[9]);
  }
  if (!babyJubIsNegativeOne(publicSignals[10])) {
    partialTicket.reservedSignedField2 = parseInt(publicSignals[10]);
  }
  if (!babyJubIsNegativeOne(publicSignals[11])) {
    partialTicket.reservedSignedField3 = parseInt(publicSignals[11]);
  }

  const claim: ZKEdDSATicketPCDClaim = {
    partialTicket,
    watermark: args.watermark.value,
    signer: pubKey
  };

  if (args.externalNullifier.value) {
    claim.nullifierHash = publicSignals[12];
    claim.externalNullifier = args.externalNullifier.value?.toString();
  }

  return new ZKEdDSATicketPCD(uuid(), claim, proof as ZKEdDSATicketPCDProof);
}

function publicSignalsFromClaim(claim: ZKEdDSATicketPCDClaim): string[] {
  const t = claim.partialTicket;
  const ret: string[] = [];

  const negOne =
    "21888242871839275222246405745257275088548364400416034343698204186575808495616";

  ret.push(
    t.ticketId === undefined ? negOne : uuidToBigInt(t.ticketId).toString()
  );
  ret.push(
    t.eventId === undefined ? negOne : uuidToBigInt(t.eventId).toString()
  );
  ret.push(
    t.productId === undefined ? negOne : uuidToBigInt(t.productId).toString()
  );
  ret.push(
    t.timestampConsumed === undefined ? negOne : t.timestampConsumed.toString()
  );
  ret.push(
    t.timestampSigned === undefined ? negOne : t.timestampSigned.toString()
  );
  ret.push(t.attendeeSemaphoreId || negOne);
  ret.push(
    t.isConsumed === undefined
      ? negOne
      : booleanToBigInt(t.isConsumed).toString()
  );
  ret.push(
    t.isRevoked === undefined ? negOne : booleanToBigInt(t.isRevoked).toString()
  );
  ret.push(
    t.ticketCategory === undefined
      ? negOne
      : numberToBigInt(t.ticketCategory).toString()
  );
  ret.push(
    t.reservedSignedField1 === undefined
      ? negOne
      : numberToBigInt(t.reservedSignedField1).toString()
  );
  ret.push(
    t.reservedSignedField2 === undefined
      ? negOne
      : numberToBigInt(t.reservedSignedField2).toString()
  );
  ret.push(
    t.reservedSignedField3 === undefined
      ? negOne
      : numberToBigInt(t.reservedSignedField3).toString()
  );
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

export async function verify(pcd: ZKEdDSATicketPCD): Promise<boolean> {
  await ensureInitialized();

  const publicSignals = publicSignalsFromClaim(pcd.claim);
  return groth16.verify(vkey, publicSignals, pcd.proof);
}

export async function serialize(
  pcd: ZKEdDSATicketPCD
): Promise<SerializedPCD<ZKEdDSATicketPCD>> {
  return {
    type: ZKEdDSATicketPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<ZKEdDSATicketPCD>;
}

export async function deserialize(
  serialized: string
): Promise<ZKEdDSATicketPCD> {
  const parsed = JSONBig({ useNativeBigInt: true }).parse(serialized);
  const proof = parsed.proof;
  const claim = parsed.claim;
  return new ZKEdDSATicketPCD(parsed.id, claim, proof);
}

export function getDisplayOptions(pcd: ZKEdDSATicketPCD): DisplayOptions {
  return {
    header: "ZK EdDSA Ticket PCD",
    displayName: "zk-eddsa-ticket-" + pcd.id.substring(0, 4)
  };
}

/**
 * ZK EdDSA Ticket PCD
 */
export const ZKEdDSATicketPCDPackage: PCDPackage<
  ZKEdDSATicketPCDClaim,
  ZKEdDSATicketPCDProof,
  ZKEdDSATicketPCDArgs,
  ZKEdDSATicketPCDInitArgs
> = {
  name: ZKEdDSATicketPCDTypeName,
  getDisplayOptions,
  renderCardBody: ZKEdDSATicketCardBody,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
