import { BabyJub, buildBabyjub, buildEddsa, Eddsa } from "circomlibjs";
import JSONBig from "json-bigint";
import { groth16, Groth16Proof } from "snarkjs";
import { v4 as uuid } from "uuid";

import type { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  ticketDataToBigInts
} from "@pcd/eddsa-ticket-pcd";
import {
  BigIntArgument,
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  RevealListArgument,
  SerializedPCD,
  StringArrayArgument
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import {
  BABY_JUB_NEGATIVE_ONE,
  babyJubIsNegativeOne,
  booleanToBigInt,
  decStringToBigIntToUuid,
  fromHexString,
  generateSnarkMessageHash,
  numberToBigInt,
  uuidToBigInt,
  requireDefinedParameter,
  hexToBigInt
} from "@pcd/util";
import vkey from "../artifacts/circuit.json";
import { ZKEdDSAEventTicketCardBody } from "./CardBody";

export const STATIC_TICKET_PCD_NULLIFIER = generateSnarkMessageHash(
  "dummy-nullifier-for-eddsa-event-ticket-pcds"
);

export const ZKEdDSAEventTicketPCDTypeName = "zk-eddsa-event-ticket-pcd";

let depsInitializedPromise: Promise<void> | undefined;
let babyJub: BabyJub;
let eddsa: Eddsa;
let savedInitArgs: ZKEdDSAEventTicketPCDInitArgs | undefined = undefined;

/**
 * Specifies which fields of an EdDSATicket should be revealed in a proof.
 */
export type EdDSATicketFieldsToReveal = {
  revealTicketId?: boolean;
  revealEventId?: boolean;
  revealProductId?: boolean;
  revealTimestampConsumed?: boolean;
  revealTimestampSigned?: boolean;
  revealAttendeeSemaphoreId?: boolean;
  revealIsConsumed?: boolean;
  revealIsRevoked?: boolean;
  revealTicketCategory?: boolean;
};

/**
 * Info required to initialize this PCD package.  These are the artifacts
 * associated with the circom circuit.
 */
export interface ZKEdDSAEventTicketPCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

/**
 * Max supported size of validEventIds field in ZKEdDSAEventTicketPCDArgs.
 */
export const VALID_EVENT_IDS_MAX_LEN = 20;

/**
 * Arguments to request a new proof.
 */
export interface ZKEdDSAEventTicketPCDArgs {
  // generally, `ticket` and `identity` are user-provided
  ticket: PCDArgument<EdDSATicketPCD>;
  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `validEventIds` is usually app-specified.  It is optional, and if included
  // the PCD proves that the ticket's event ID is in this list.  This is a list of
  // UUIDs with max length VALID_EVENT_IDS_MAX_LEN (20).
  validEventIds: StringArrayArgument;

  // `fieldsToReveal`, `externalNullifier`, `watermark` are usually app-specified
  fieldsToReveal: RevealListArgument<EdDSATicketFieldsToReveal>;
  watermark: BigIntArgument;

  // provide externalNullifier field to request a nullifierHash
  // if you don't provide this field, no nullifierHash will be outputted
  externalNullifier: BigIntArgument;
}

/**
 * Claim part of a ZKEdDSAEventTicketPCD contains all public/revealed fields.
 */
export interface ZKEdDSAEventTicketPCDClaim {
  partialTicket: Partial<ITicketData>;
  watermark: string;
  signer: EdDSAPublicKey;

  // only if requested in PCDArgs
  validEventIds?: string[];
  externalNullifier?: string;
  nullifierHash?: string;
}

/**
 * ZKEdDSAEventTicketPCD PCD type representation.
 */
export class ZKEdDSAEventTicketPCD
  implements PCD<ZKEdDSAEventTicketPCDClaim, Groth16Proof>
{
  type = ZKEdDSAEventTicketPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSAEventTicketPCDClaim,
    readonly proof: Groth16Proof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

/**
 * Initialize ZKEdDSAEventTicketPCDPackage.
 */
export async function init(args: ZKEdDSAEventTicketPCDInitArgs) {
  savedInitArgs = args;
}

async function ensureDepsInitialized(): Promise<void> {
  if (!depsInitializedPromise) {
    depsInitializedPromise = (async () => {
      babyJub = await buildBabyjub();
      eddsa = await buildEddsa();
    })();
  }

  await depsInitializedPromise;
}

async function ensureInitialized(): Promise<ZKEdDSAEventTicketPCDInitArgs> {
  if (!savedInitArgs) {
    throw new Error(
      "Cannot initialize ZKEdDSAEventTicketPCDPackage: init has not been called yet"
    );
  }

  await ensureDepsInitialized();
  return savedInitArgs;
}

async function checkProveInputs(args: ZKEdDSAEventTicketPCDArgs): Promise<{
  ticketPCD: EdDSATicketPCD;
  identityPCD: SemaphoreIdentityPCD;
  fieldsToReveal: EdDSATicketFieldsToReveal;
  watermark: bigint;
}> {
  const serializedTicketPCD = args.ticket.value?.pcd;
  if (!serializedTicketPCD) {
    throw new Error("Cannot make proof: missing ticket PCD");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("Cannot make proof: missing identity PCD");
  }

  const fieldsToReveal = args.fieldsToReveal.value;
  if (!fieldsToReveal) {
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

  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  return {
    ticketPCD: deserializedTicket,
    identityPCD: identityPCD,
    fieldsToReveal: fieldsToReveal,
    watermark: BigInt(args.watermark.value)
  };
}

/**
 * Convert a list of valid event IDs from input format (variable-length list
 * of UUID strings) to snark signal format (fixed-length list of bigint
 * strings).  The result always has length VALID_EVENT_IDS_MAX_LEN with
 * unused fields are filled in with a value of BABY_JUB_NEGATIVE_ONE.
 */
export function snarkInputForValidEventIds(validEventIds?: string[]): string[] {
  if (validEventIds === undefined) {
    validEventIds = [];
  }
  if (validEventIds.length > VALID_EVENT_IDS_MAX_LEN) {
    throw new Error(
      "validEventIds for a ZKEdDSAEventTicketPCD can have up to 100 entries.  " +
        validEventIds.length +
        " given."
    );
  }
  const snarkIds = new Array<string>(VALID_EVENT_IDS_MAX_LEN);
  let i = 0;
  for (const validId of validEventIds) {
    snarkIds[i] = uuidToBigInt(validId).toString();
    ++i;
  }
  for (; i < VALID_EVENT_IDS_MAX_LEN; ++i) {
    snarkIds[i] = BABY_JUB_NEGATIVE_ONE.toString();
  }
  return snarkIds;
}

function snarkInputForProof(
  ticketPCD: EdDSATicketPCD,
  identityPCD: SemaphoreIdentityPCD,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  validEventIdsInput: string[] | undefined,
  externalNullifer: string | undefined,
  watermark: bigint
): Record<string, `${number}` | `${number}`[]> {
  const ticketAsBigIntArray = ticketDataToBigInts(ticketPCD.claim.ticket);
  const pubKey = ticketPCD.proof.eddsaPCD.claim.publicKey;
  const rawSig = eddsa.unpackSignature(
    fromHexString(ticketPCD.proof.eddsaPCD.proof.signature)
  );

  const checkValidEventIds = validEventIdsInput !== undefined;

  return {
    // Ticket data fields
    ticketId: ticketAsBigIntArray[0].toString(),
    revealTicketId: fieldsToReveal.revealTicketId ? "1" : "0",
    ticketEventId: ticketAsBigIntArray[1].toString(),
    revealTicketEventId: fieldsToReveal.revealEventId ? "1" : "0",
    ticketProductId: ticketAsBigIntArray[2].toString(),
    revealTicketProductId: fieldsToReveal.revealProductId ? "1" : "0",
    ticketTimestampConsumed: ticketAsBigIntArray[3].toString(),
    revealTicketTimestampConsumed: fieldsToReveal.revealTimestampConsumed
      ? "1"
      : "0",
    ticketTimestampSigned: ticketAsBigIntArray[4].toString(),
    revealTicketTimestampSigned: fieldsToReveal.revealTimestampSigned
      ? "1"
      : "0",
    ticketAttendeeSemaphoreId: ticketAsBigIntArray[5].toString(),
    revealTicketAttendeeSemaphoreId: fieldsToReveal.revealAttendeeSemaphoreId
      ? "1"
      : "0",
    ticketIsConsumed: ticketAsBigIntArray[6].toString(),
    revealTicketIsConsumed: fieldsToReveal.revealIsConsumed ? "1" : "0",
    ticketIsRevoked: ticketAsBigIntArray[7].toString(),
    revealTicketIsRevoked: fieldsToReveal.revealIsRevoked ? "1" : "0",
    ticketCategory: ticketAsBigIntArray[8].toString(),
    revealTicketCategory: fieldsToReveal.revealTicketCategory ? "1" : "0",
    reservedSignedField1: "0",
    // These fields currently do not have any preset semantic meaning, although the intention
    // is for them to convert into meaningful fields in the future. We are reserving them now
    // so that we can keep the Circom configuration (.zkey and .wasm) as we add new fields,
    // and we would only need to change the TypeScript. For now, we will treat the inputs as
    // 0 in terms of signatures.
    revealReservedSignedField1: "0",
    reservedSignedField2: "0",
    revealReservedSignedField2: "0",
    reservedSignedField3: "0",
    revealReservedSignedField3: "0",

    // Ticket signature fields
    ticketSignerPubkeyAx: hexToBigInt(pubKey[0]).toString(),
    ticketSignerPubkeyAy: hexToBigInt(pubKey[1]).toString(),
    ticketSignatureR8x: babyJub.F.toObject(rawSig.R8[0]).toString(),
    ticketSignatureR8y: babyJub.F.toObject(rawSig.R8[1]).toString(),
    ticketSignatureS: rawSig.S.toString(),

    // Attendee identity secret
    semaphoreIdentityNullifier: identityPCD.claim.identity
      .getNullifier()
      .toString(),
    semaphoreIdentityTrapdoor: identityPCD.claim.identity
      .getTrapdoor()
      .toString(),

    // Valid event ID list
    validEventIds: snarkInputForValidEventIds(validEventIdsInput),
    checkValidEventIds: checkValidEventIds ? "1" : "0",

    // Security features
    externalNullifier:
      externalNullifer || STATIC_TICKET_PCD_NULLIFIER.toString(),
    revealNullifierHash: externalNullifer ? "1" : "0",
    watermark: watermark.toString()
  } as Record<string, `${number}` | `${number}`[]>;
}

function claimFromProofResult(
  ticketPCD: EdDSATicketPCD,
  publicSignals: string[],
  validEventIds: string[] | undefined,
  externalNullifer: string | undefined,
  watermark: bigint
): ZKEdDSAEventTicketPCDClaim {
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
  // These three fields are currently not typed or being used, but are kept
  // as reserved fields that are hardcoded to zero and included in the preimage
  // of the hashed signature. As such, the flags for revealing these reserved
  // signed fields should always be -1 until they are being typed and used.
  if (!babyJubIsNegativeOne(publicSignals[9])) {
    throw new Error(
      "ZkEdDSAEventTicketPCD: reservedSignedField1 is not in use"
    );
  }
  if (!babyJubIsNegativeOne(publicSignals[10])) {
    throw new Error(
      "ZkEdDSAEventTicketPCD: reservedSignedField2 is not in use"
    );
  }
  if (!babyJubIsNegativeOne(publicSignals[11])) {
    throw new Error(
      "ZkEdDSAEventTicketPCD: reservedSignedField3 is not in use"
    );
  }

  const claim: ZKEdDSAEventTicketPCDClaim = {
    partialTicket,
    watermark: watermark.toString(),
    signer: ticketPCD.proof.eddsaPCD.claim.publicKey
  };

  if (validEventIds !== undefined) {
    claim.validEventIds = validEventIds;
  }

  if (externalNullifer !== undefined) {
    claim.nullifierHash = publicSignals[12];
    claim.externalNullifier = externalNullifer;
  }

  return claim;
}

/**
 * Creates a new ZKEdDSAEventTicketPCD.
 */
export async function prove(
  args: ZKEdDSAEventTicketPCDArgs
): Promise<ZKEdDSAEventTicketPCD> {
  const initArgs = await ensureInitialized();

  const { ticketPCD, identityPCD, fieldsToReveal, watermark } =
    await checkProveInputs(args);

  const snarkInput = snarkInputForProof(
    ticketPCD,
    identityPCD,
    fieldsToReveal,
    args.validEventIds.value,
    args.externalNullifier.value,
    watermark
  );

  const { proof, publicSignals } = await groth16.fullProve(
    snarkInput,
    initArgs.wasmFilePath,
    initArgs.zkeyFilePath
  );

  const claim = claimFromProofResult(
    ticketPCD,
    publicSignals,
    args.validEventIds.value,
    args.externalNullifier.value,
    watermark
  );

  return new ZKEdDSAEventTicketPCD(uuid(), claim, proof);
}

function publicSignalsFromClaim(claim: ZKEdDSAEventTicketPCDClaim): string[] {
  const t = claim.partialTicket;
  const ret: string[] = [];

  const negOne = BABY_JUB_NEGATIVE_ONE.toString();

  // Outputs appear in public signals first
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
  // Placeholder for reserved fields
  ret.push(negOne, negOne, negOne);
  ret.push(claim.nullifierHash || negOne);

  // Public inputs appear in public signals in declaration order
  ret.push(hexToBigInt(claim.signer[0]).toString());
  ret.push(hexToBigInt(claim.signer[1]).toString());

  for (const eventId of snarkInputForValidEventIds(claim.validEventIds)) {
    ret.push(eventId);
  }
  ret.push(claim.validEventIds !== undefined ? "1" : "0"); // checkValidEventIds

  ret.push(
    claim.externalNullifier?.toString() ||
      STATIC_TICKET_PCD_NULLIFIER.toString()
  );

  ret.push(claim.watermark);

  return ret;
}

/**
 * Verify the claims and proof of a ZKEdDSAEventTicketPCD.
 */
export async function verify(pcd: ZKEdDSAEventTicketPCD): Promise<boolean> {
  // verify() requires dependencies but not artifacts (verification key
  // is available in code as vkey imported above), so doesn't require
  // full package initialization.

  const publicSignals = publicSignalsFromClaim(pcd.claim);
  return groth16.verify(vkey, publicSignals, pcd.proof);
}

/**
 * Serialize a ZKEdDSAEventTicketPCD.
 */
export async function serialize(
  pcd: ZKEdDSAEventTicketPCD
): Promise<SerializedPCD<ZKEdDSAEventTicketPCD>> {
  return {
    type: ZKEdDSAEventTicketPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<ZKEdDSAEventTicketPCD>;
}

/**
 * Deserialize a ZKEdDSAEventTicketPCD.
 */
export async function deserialize(
  serialized: string
): Promise<ZKEdDSAEventTicketPCD> {
  const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(
    serialized
  );

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new ZKEdDSAEventTicketPCD(id, claim, proof);
}

/**
 * Get display options for a ZKEdDSAEventTicketPCD.
 */
export function getDisplayOptions(pcd: ZKEdDSAEventTicketPCD): DisplayOptions {
  return {
    header: "ZK EdDSA Event Ticket PCD",
    displayName: "zk-eddsa-event-ticket-" + pcd.id.substring(0, 4)
  };
}

/**
 * A PCD representing a proof of ownership of an EdDSA-signed ticket. The prover
 * is able to prove ownership of a ticket corresponding to their semaphore
 * identity, and optionally prove the ticket corresponds to one of a list
 * of valid events. The prover can keep their identity private, and selectively
 * reveal some or none of the individual ticket fields. To harden against
 * various abuses, the proof can be watermarked, and can include a nullifier.
 */
export const ZKEdDSAEventTicketPCDPackage: PCDPackage<
  ZKEdDSAEventTicketPCDClaim,
  Groth16Proof,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDInitArgs
> = {
  name: ZKEdDSAEventTicketPCDTypeName,
  getDisplayOptions,
  renderCardBody: ZKEdDSAEventTicketCardBody,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
