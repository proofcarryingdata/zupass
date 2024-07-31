import {
  gpcBindConfig,
  GPCBoundConfig,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCRevealedClaims,
  PODMembershipLists
} from "@pcd/gpc";
import { checkPublicKeyFormat, PODEntries, PODValue } from "@pcd/pod";
import {
  IPODTicketData,
  MapTicketDataToPODEntries,
  TicketDataSchema
} from "@pcd/pod-ticket-pcd";
import JSONBig from "json-bigint";
import _ from "lodash";
import { validate as validateUUID } from "uuid";
import {
  PODTicketFieldsToReveal,
  TicketMatchPatterns,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDClaim
} from "./ZKPODTicketPCD";
import { entriesFromPattern, patternsToPODValueTuples } from "./ticketPatterns";

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

/**
 * Convert a key from the {@link PODTicketFieldsToReveal} object to a key in the
 * {@link RevealedEntries} object.
 *
 * @param key - The key to convert.
 * @returns The converted key.
 */
function revealedFieldKeyToEntryName(
  key: keyof PODTicketFieldsToReveal
): RevealableTicketField {
  return (key.charAt(6).toLowerCase() +
    key.replace(/^reveal/, "").slice(1)) as RevealableTicketField;
}

/**
 * Add the revealed entries from the {@link PODTicketFieldsToReveal} object to
 * the {@link RevealedEntries} object.
 *
 * @param revealedEntries - The revealed entries.
 * @param revealedFields - The revealed fields.
 * @returns The updated revealed entries.
 */
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

/**
 * Convert a {@link PODEntries} to a {@link Partial<IPODTicketData>}.
 *
 * @param entries - The entries to convert.
 * @returns The converted entries.
 */
export function podEntriesToPartialTicketData(
  entries: PODEntries
): Partial<IPODTicketData> {
  return TicketDataSchema.partial().parse(
    Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [key, entry.value])
    )
  );
}

function isMapTicketDataToPODEntriesKey(
  key: string
): key is keyof typeof MapTicketDataToPODEntries {
  return key in MapTicketDataToPODEntries;
}

function partialTicketDataToPODEntries(
  data: Partial<IPODTicketData>
): PODEntries | undefined {
  const result: PODEntries = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isMapTicketDataToPODEntriesKey(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
    const mapper = MapTicketDataToPODEntries[key];
    // @ts-expect-error TypeScript can't infer that the value type matches the mapper input
    result[key] = mapper(value);
  }
  return Object.keys(result).length > 0 ? result : undefined;
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
        entries: partialTicketDataToPODEntries(claim.partialTicket),
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
 * Check that the claim is valid for the proof request.
 *
 * @param claim - The claim to check.
 * @param proofRequest - The proof request to check against.
 */
export function checkClaimAgainstProofRequest(
  claim: ZKPODTicketPCDClaim,
  proofRequest: ProofRequest
): void {
  if (
    !compareProofConfigWithBoundConfig(proofRequest.proofConfig, claim.config)
  ) {
    throw new Error("GPC config does not match expected configuration");
  }

  const revealedClaims = claimToGPCRevealedClaims(claim);

  if (
    !_.isEqual(revealedClaims.membershipLists, proofRequest.membershipLists)
  ) {
    throw new Error("Unequal membership lists");
  }

  const stringify = JSONBig({ useNativeBigInt: true }).stringify;

  if (
    !_.isEqual(
      revealedClaims.owner?.externalNullifier,
      proofRequest.externalNullifier
    )
  ) {
    throw new Error(
      `Unequal external nullifiers: ${stringify(
        revealedClaims.owner?.externalNullifier
      )} !== ${stringify(proofRequest.externalNullifier)}`
    );
  }

  if (!_.isEqual(revealedClaims.watermark, proofRequest.watermark)) {
    throw new Error(
      `Unequal watermarks: ${stringify(
        revealedClaims.watermark
      )} !== ${stringify(proofRequest.watermark)}`
    );
  }
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
        if (event.productIds) {
          if (!Array.isArray(event.productIds)) {
            throw new Error("Product IDs must be an array");
          }
          for (const productId of event.productIds) {
            if (!validateUUID(productId)) {
              throw new Error("Product ID must be a valid UUID");
            }
          }
        }
      }
    }
  }
}
