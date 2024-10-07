import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName,
  ITicketData,
  ticketDataToBigInts
} from "@pcd/eddsa-ticket-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Groth16Proof, groth16 } from "@pcd/snarkjs";
import {
  BABY_JUB_NEGATIVE_ONE,
  babyJubIsNegativeOne,
  booleanToBigInt,
  decStringToBigIntToUuid,
  fromHexString,
  generateSnarkMessageHash,
  hexToBigInt,
  numberToBigInt,
  requireDefinedParameter,
  uuidToBigInt
} from "@pcd/util";
import { unpackSignature } from "@zk-kit/eddsa-poseidon";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import vkey from "../artifacts/circuit.json";
import {
  EdDSATicketFieldsToReveal,
  VALID_EVENT_IDS_MAX_LEN,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDClaim,
  ZKEdDSAEventTicketPCDInitArgs,
  ZKEdDSAEventTicketPCDTypeName
} from "./ZKEdDSAEventTicketPCD";

export const STATIC_TICKET_PCD_NULLIFIER = generateSnarkMessageHash(
  "dummy-nullifier-for-eddsa-event-ticket-pcds"
);

let savedInitArgs: ZKEdDSAEventTicketPCDInitArgs | undefined = undefined;

/**
 * Initialize ZKEdDSAEventTicketPCDPackage.
 */
export async function init(args: ZKEdDSAEventTicketPCDInitArgs): Promise<void> {
  savedInitArgs = args;
}

async function ensureInitialized(): Promise<ZKEdDSAEventTicketPCDInitArgs> {
  if (!savedInitArgs) {
    throw new Error(
      "Cannot initialize ZKEdDSAEventTicketPCDPackage: init has not been called yet"
    );
  }

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

  const rawSig = unpackSignature(
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
    // This field was previously reserved, but is now used for attendee email.
    // See later comment to explain the concept of reserved fields.
    reservedSignedField1: ticketAsBigIntArray[9].toString(),
    revealReservedSignedField1: fieldsToReveal.revealAttendeeEmail ? "1" : "0",
    // This field was previously reserved, but is now used for attendee name:
    reservedSignedField2: ticketAsBigIntArray[10].toString(),
    revealReservedSignedField2: fieldsToReveal.revealAttendeeName ? "1" : "0",

    // This field currently does not have any preset semantic meaning, although the intention
    // is for it to convert into a meaningful field in the future. We are reserving it now
    // so that we can keep the Circom configuration (.zkey and .wasm) as we add new fields,
    // and we would only need to change the TypeScript. For now, we will treat the inputs as
    // 0 in terms of signatures.
    reservedSignedField3: "0",
    revealReservedSignedField3: "0",

    // Ticket signature fields
    ticketSignerPubkeyAx: hexToBigInt(pubKey[0]).toString(),
    ticketSignerPubkeyAy: hexToBigInt(pubKey[1]).toString(),
    ticketSignatureR8x: rawSig.R8[0].toString(),
    ticketSignatureR8y: rawSig.R8[1].toString(),
    ticketSignatureS: rawSig.S.toString(),

    // Attendee identity secret
    semaphoreIdentityNullifier: identityPCD.claim.identityV3
      .getNullifier()
      .toString(),
    semaphoreIdentityTrapdoor: identityPCD.claim.identityV3
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
  if (!babyJubIsNegativeOne(publicSignals[9])) {
    partialTicket.attendeeEmail = ticketPCD.claim.ticket.attendeeEmail;
  }
  if (!babyJubIsNegativeOne(publicSignals[10])) {
    partialTicket.attendeeName = ticketPCD.claim.ticket.attendeeName;
  }

  // This field is currently not typed or being used, but is being kept as
  // a reserved field that is hardcoded to zero and included in the preimage
  // of the hashed signature. As such, the flags for revealing this reserved
  // signed field should always be -1 until it is being typed and used.
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

export function getProveDisplayOptions(): ProveDisplayOptions<ZKEdDSAEventTicketPCDArgs> {
  return {
    defaultArgs: {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        description: "Generate a proof for the selected ticket",
        validate(value, params): boolean {
          if (value.type !== EdDSATicketPCDTypeName || !value.claim) {
            return false;
          }

          if (params?.eventIds?.length && params?.productIds?.length) {
            if (params.eventIds.length !== params.productIds.length) {
              // soft-error: dev passed invalid eventIds and productIds
              console.error(
                "eventIds and productIds must have the same length"
              );
              return false;
            }

            if (
              !params.eventIds.find(
                (eventId, i) =>
                  eventId === value.claim.ticket.eventId &&
                  params.productIds?.[i] === value.claim.ticket.productId
              )
            ) {
              return false;
            }
          }

          if (params?.eventIds?.length) {
            if (!params.eventIds.includes(value.claim.ticket.eventId)) {
              return false;
            }
          }

          if (params?.productIds?.length) {
            if (!params.productIds.includes(value.claim.ticket.productId)) {
              return false;
            }
          }

          if (params?.publicKeys?.length) {
            if (
              !params.publicKeys.find((publicKey) =>
                isEqualEdDSAPublicKey(
                  publicKey,
                  value.proof.eddsaPCD.claim.publicKey
                )
              )
            ) {
              return false;
            }
          }
          return true;
        },
        validatorParams: {
          eventIds: [],
          productIds: [],
          notFoundMessage: "You do not have any eligible tickets."
        }
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        displayName: "",
        description: "The following information will be revealed"
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        defaultVisible: false,
        description:
          "Your Zupass comes with a primary Semaphore Identity which represents an user in the Semaphore protocol."
      },
      validEventIds: {
        argumentType: ArgumentTypeName.StringArray,
        defaultVisible: false,
        description:
          "The list of valid event IDs that the ticket can be used for. If this is not provided, the proof will not check the validity of the event ID. When this is provided and event id is not directly revealed, the proof can only be used to prove that the ticket is valid for one of the events in the list."
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        defaultVisible: false
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        defaultVisible: false
      }
    }
  };
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
  ret.push(
    t.attendeeEmail === undefined
      ? negOne
      : generateSnarkMessageHash(t.attendeeEmail).toString()
  );
  ret.push(
    t.attendeeName === undefined
      ? negOne
      : generateSnarkMessageHash(t.attendeeName).toString()
  );

  // Placeholder for reserved field
  ret.push(negOne);

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

export function isZKEdDSAEventTicketPCD(
  pcd: PCD
): pcd is ZKEdDSAEventTicketPCD {
  return pcd.type === ZKEdDSAEventTicketPCDTypeName;
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
  init,
  getProveDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};

export function isZKEdDSAEventTicketPCDPackage(
  p: PCDPackage | undefined
): p is typeof ZKEdDSAEventTicketPCDPackage {
  return p?.name === ZKEdDSAEventTicketPCDTypeName;
}
