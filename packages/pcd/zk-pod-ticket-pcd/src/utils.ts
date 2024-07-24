import {
  gpcBindConfig,
  GPCBoundConfig,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCRevealedClaims,
  PODMembershipLists
} from "@pcd/gpc";
import {
  checkPublicKeyFormat,
  PODEdDSAPublicKeyValue,
  PODEntries,
  PODStringValue,
  PODValue
} from "@pcd/pod";
import {
  dataToPodEntries,
  IPODTicketData,
  TicketDataSchema
} from "@pcd/pod-ticket-pcd";
import _ from "lodash";
import { validate as validateUUID } from "uuid";
import {
  PODTicketFieldsToReveal,
  TicketMatchPatterns,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDClaim
} from "./ZKPODTicketPCD";

type RemoveRevealPrefix<T extends string> = T extends `reveal${infer R}`
  ? Uncapitalize<R>
  : never;
export type RevealableTicketField = RemoveRevealPrefix<
  keyof PODTicketFieldsToReveal
>;

type RevealedEntries = {
  [key in RevealableTicketField]?: GPCProofEntryConfig;
};

/**
 * The RevealedEntries *must* include these entries, even if they are not
 * revealed, because they are depended upon by the `idPatterns` tuple.
 */
const DEFAULT_ENTRIES_CONFIG: RevealedEntries = {
  attendeeSemaphoreId: {
    isRevealed: false,
    isOwnerID: true
  },
  eventId: {
    isRevealed: false
  },
  productId: {
    isRevealed: false
  }
};

function revealedFieldKeyToEntryName(
  key: keyof PODTicketFieldsToReveal
): RevealableTicketField {
  return (key.charAt(6).toLowerCase() +
    key.replace(/^reveal/, "").slice(1)) as RevealableTicketField;
}

function entriesFromPattern(
  patterns: TicketMatchPatterns
): `${string}.${string}`[] {
  const idPatternEntries: `${string}.${string}`[] = [];

  if (patterns.length > 0) {
    idPatternEntries.push("ticketPOD.$signerPublicKey");
    if (patterns[0].events && patterns[0].events.length > 0) {
      idPatternEntries.push("ticketPOD.eventId");
      if (
        patterns[0].events[0].products &&
        patterns[0].events[0].products.length > 0
      ) {
        idPatternEntries.push("ticketPOD.productId");
      }
    }
  }

  return idPatternEntries;
}

function addRevealedEntriesFromRevealedFields(
  revealedEntries: RevealedEntries,
  revealedFields: PODTicketFieldsToReveal
): RevealedEntries {
  const result = { ...revealedEntries };
  for (const [key, value] of Object.entries(revealedFields)) {
    const entryName = revealedFieldKeyToEntryName(
      key as keyof PODTicketFieldsToReveal
    );
    result[entryName] = {
      ...result[entryName],
      isRevealed: value
    };
  }
  return result;
}

/**
 * Arguments for making a GPC config.
 */
interface ConfigArgs {
  ticketPatterns: TicketMatchPatterns;
  fieldsToReveal: PODTicketFieldsToReveal;
  revealSignerKey: boolean;
}

/**
 * Makes a GPC config.
 *
 * This is used twice: once to create a GPC config for proving purposes, where
 * the data comes from the args, and again during verification when we need to
 * re-build the config from data in the claim.
 *
 * @param param0 A ConfigArgs
 * @returns A GPCProofConfig
 */
function makeGPCConfig({
  ticketPatterns,
  fieldsToReveal,
  revealSignerKey
}: ConfigArgs): GPCProofConfig {
  const idPatternEntries = entriesFromPattern(ticketPatterns);
  const entryConfig = addRevealedEntriesFromRevealedFields(
    DEFAULT_ENTRIES_CONFIG,
    fieldsToReveal
  );

  return {
    pods: {
      ticketPOD: {
        entries: entryConfig,
        signerPublicKey: {
          isRevealed: revealSignerKey
        }
      }
    },
    ...(ticketPatterns.length > 0 && ticketPatterns[0].events
      ? {
          tuples: {
            idPatterns: {
              entries: idPatternEntries,
              isMemberOf: "admissiblePatterns"
            }
          }
        }
      : {})
  } satisfies GPCProofConfig;
}

export function podEntriesToPartialTicketData(
  entries: PODEntries
): Partial<IPODTicketData> {
  return TicketDataSchema.partial().parse(
    Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [key, entry.value])
    )
  );
}

/**
 * Makes a GPC config from ZKPODTicketPCDArgs.
 *
 * @param args A ZKPODTicketPCDArgs
 * @returns A GPCProofConfig
 */
export function gpcConfigFromArgs(args: ZKPODTicketPCDArgs): GPCProofConfig {
  return makeGPCConfig({
    ticketPatterns: args.ticket.validatorParams?.ticketPatterns ?? [],
    fieldsToReveal: args.fieldsToReveal.value ?? {},
    revealSignerKey: args.revealSignerPublicKey.value ?? false
  });
}

/**
 * Compare two GPCProofConfigs for equality.
 *
 * @param proofConfig - The first proof config.
 * @param boundConfig - The second bound config.
 * @returns Whether the two configs are equal.
 */
export function compareProofConfigWithBoundConfig(
  proofConfig: GPCProofConfig,
  boundConfig: GPCBoundConfig
): boolean {
  const { boundConfig: secondBoundConfig } = gpcBindConfig(proofConfig);
  secondBoundConfig.circuitIdentifier = boundConfig.circuitIdentifier;
  return _.isEqual(boundConfig, secondBoundConfig);
}

/**
 * A tuple representing an admissible pattern for the ticket.
 * These patterns are hierarchical, in the sense that one signing key can have
 * many event IDs, and each event ID can have many product IDs. However, for
 * use with GPC, we flatten these into tuples.
 */
type AdmissibleTuple =
  // Match on signing  key, event ID, product ID
  | [PODEdDSAPublicKeyValue, PODStringValue, PODStringValue]
  // Match on signing key, event ID
  | [PODEdDSAPublicKeyValue, PODStringValue];

/**
 * Convert a {@link TicketMatchPatterns} into an array of {@link AdmissibleTuple}.
 * As a generator function, it yields one tuple at a time, and should generally
 * be used in a `for...of` loop or with a function like `Array.from`.
 *
 * @param value The patterns to convert
 * @returns An array of tuples
 */
export function* patternsToPODValueTuples(
  value: TicketMatchPatterns
): Generator<AdmissibleTuple> {
  for (const pattern of value) {
    if (pattern.events) {
      for (const event of pattern.events) {
        if (event.products) {
          for (const product of event.products) {
            yield [
              PODEdDSAPublicKeyValue(pattern.signerPublicKey),
              { type: "string", value: event.id },
              { type: "string", value: product.id }
            ];
          }
        } else {
          yield [
            PODEdDSAPublicKeyValue(pattern.signerPublicKey),
            { type: "string", value: event.id }
          ];
        }
      }
    }
  }
}

/**
 * Convert a ZKPODTicketPCDClaim into GPCRevealedClaims.
 *
 * @param claim - The claim to convert.
 * @returns The converted claim.
 */
export function claimToGPCRevealedClaims(
  claim: ZKPODTicketPCDClaim
): GPCRevealedClaims {
  return {
    pods: {
      ticketPOD: {
        entries: dataToPodEntries(
          claim.partialTicket,
          TicketDataSchema.partial(),
          TicketDataSchema.partial().shape
        ),
        signerPublicKey: claim.signerPublicKey
      }
    },
    membershipLists: {
      ...(claim.ticketPatterns.length > 0 && claim.ticketPatterns[0].events
        ? {
            admissiblePatterns: Array.from(
              patternsToPODValueTuples(claim.ticketPatterns)
            )
          }
        : {})
    },
    owner: {
      externalNullifier: claim.externalNullifier,
      nullifierHash: claim.nullifierHash
    },
    watermark: claim.watermark
  };
}

export type ProofRequest = {
  proofConfig: GPCProofConfig;
  membershipLists: PODMembershipLists;
  externalNullifier: PODValue;
  watermark: PODValue;
};

/**
 * Create a proof request for the ZKPODTicketPCD.
 *
 * @param args - The arguments for the proof request.
 * @returns A proof request.
 */
export function makeProofRequest(args: ZKPODTicketPCDArgs): ProofRequest {
  checkTicketPatterns(args.ticket.validatorParams?.ticketPatterns ?? []);
  const admissiblePatterns = args.ticket.validatorParams?.ticketPatterns
    ? Array.from(
        patternsToPODValueTuples(args.ticket.validatorParams?.ticketPatterns)
      )
    : [];
  return {
    proofConfig: gpcConfigFromArgs(args),
    membershipLists:
      admissiblePatterns.length > 0
        ? {
            admissiblePatterns
          }
        : {},
    externalNullifier: {
      type: "string",
      value: args.externalNullifier.value ?? "0"
    },
    watermark: { type: "string", value: args.watermark.value ?? "0" }
  };
}

/**
 * Check that the ticket patterns are valid.
 * They should be an array of objects, each with a signerPublicKey and
 * optionally an events array. Each event object should have an id and
 * optionally a products array. Each product object should have an id.
 *
 * @param patterns - The ticket patterns to check.
 */
export function checkTicketPatterns(patterns: TicketMatchPatterns): void {
  if (!Array.isArray(patterns)) {
    throw new Error("Ticket match patterns must be an array");
  }

  for (const pattern of patterns) {
    checkPublicKeyFormat(pattern.signerPublicKey, "signerPublicKey");
    if (pattern.events) {
      if (!Array.isArray(pattern.events)) {
        throw new Error("Events must be an array");
      }
      for (const event of pattern.events) {
        if (!event.id) {
          throw new Error("Event ID is required");
        }
        if (!validateUUID(event.id)) {
          throw new Error("Event ID must be a valid UUID");
        }
        if (event.products) {
          if (!Array.isArray(event.products)) {
            throw new Error("Products must be an array");
          }
          for (const product of event.products) {
            if (!product.id) {
              throw new Error("Product ID is required");
            }
            if (!validateUUID(product.id)) {
              throw new Error("Product ID must be a valid UUID");
            }
          }
        }
      }
    }
  }
}
