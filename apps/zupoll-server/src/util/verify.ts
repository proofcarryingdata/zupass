import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import {
  ADMIN_GROUP_ID,
  DEVCONNECT_ORGANIZERS_GROUP_URL,
  DEVCONNECT_PARTICIPANTS_GROUP_URL,
  PARTICIPANTS_GROUP_ID,
  SemaphoreGroups,
  ZUZALU_HISTORIC_API_URL,
  ZUZALU_ORGANIZERS_GROUP_URL,
  ZUZALU_PARTICIPANTS_GROUP_URL
} from "./auth";
import { logger } from "./logger";

const residentRootCache = new Set<string>();
const organizerRootCache = new Set<string>();
const genericIssuanceRootCache = new Set<string>();

// Returns nullfier or throws error.
export async function verifyGroupProof(
  semaphoreGroupUrl: string,
  proof: string,
  options: {
    signal?: string;
    allowedGroups?: string[];
    allowedRoots?: string[];
    claimedExtNullifier?: string;
  }
): Promise<string> {
  logger.info(`verifyGroupProof`, semaphoreGroupUrl, options);
  logger.info(`proof:`, proof);
  logger.info(`options:`, options);

  if (
    options.allowedGroups &&
    !options.allowedGroups.includes(semaphoreGroupUrl)
  ) {
    throw new Error(`Not in Semaphore groups allowed to perform action.`);
  }

  const pcd = await SemaphoreGroupPCDPackage.deserialize(proof);
  const verified = await SemaphoreGroupPCDPackage.verify(pcd);
  if (!verified) {
    throw new Error("Invalid proof.");
  }

  // check externalNullifier
  if (
    options.claimedExtNullifier &&
    generateSnarkMessageHash(options.claimedExtNullifier).toString() !==
      pcd.claim.externalNullifier
  ) {
    throw new Error("Invalid external nullifier in proof.");
  }

  // check signal
  if (
    options.signal &&
    pcd.claim.signal !== generateSnarkMessageHash(options.signal).toString()
  ) {
    throw new Error("Posted signal doesn't match signal in claim.");
  }

  if (options.allowedRoots && options.allowedRoots.length > 0) {
    let anyRootMatches = false;

    for (const root of options.allowedRoots) {
      if (pcd.claim.merkleRoot === root) {
        anyRootMatches = true;
        break;
      }
    }

    if (!anyRootMatches) {
      logger.info("allowed roots", options.allowedRoots);
      logger.info("merkle root", pcd.claim.merkleRoot);
      throw new Error("Current root doesn't match any of the allowed roots");
    }
  } else if (semaphoreGroupUrl === ZUZALU_PARTICIPANTS_GROUP_URL) {
    if (!residentRootCache.has(pcd.claim.merkleRoot)) {
      const validResidentRoot = await verifyRootValidity(
        PARTICIPANTS_GROUP_ID,
        pcd.claim.merkleRoot,
        ZUZALU_HISTORIC_API_URL!
      );
      if (validResidentRoot) {
        residentRootCache.add(pcd.claim.merkleRoot);
      } else {
        throw new Error("Claim root isn't a valid resident root.");
      }
    }
  } else if (semaphoreGroupUrl === ZUZALU_ORGANIZERS_GROUP_URL) {
    if (!organizerRootCache.has(pcd.claim.merkleRoot)) {
      const validOrganizerRoot = await verifyRootValidity(
        ADMIN_GROUP_ID,
        pcd.claim.merkleRoot,
        ZUZALU_HISTORIC_API_URL!
      );
      if (validOrganizerRoot) {
        organizerRootCache.add(pcd.claim.merkleRoot);
      } else {
        throw new Error("Claim root isn't a valid organizer root.");
      }
    }
  } else if (semaphoreGroupUrl === DEVCONNECT_PARTICIPANTS_GROUP_URL) {
    if (!residentRootCache.has(pcd.claim.merkleRoot)) {
      const validResidentRoot = await verifyRootValidity(
        SemaphoreGroups.DevconnectAttendees,
        pcd.claim.merkleRoot,
        ZUZALU_HISTORIC_API_URL!
      );
      if (validResidentRoot) {
        residentRootCache.add(pcd.claim.merkleRoot);
      } else {
        throw new Error("Claim root isn't a valid resident root.");
      }
    }
  } else if (semaphoreGroupUrl === DEVCONNECT_ORGANIZERS_GROUP_URL) {
    if (!organizerRootCache.has(pcd.claim.merkleRoot)) {
      const validOrganizerRoot = await verifyRootValidity(
        SemaphoreGroups.DevconnectOrganizers,
        pcd.claim.merkleRoot,
        ZUZALU_HISTORIC_API_URL!
      );
      if (validOrganizerRoot) {
        organizerRootCache.add(pcd.claim.merkleRoot);
      } else {
        throw new Error("Claim root isn't a valid organizer root.");
      }
    }
  } else {
    if (!genericIssuanceRootCache.has(pcd.claim.merkleRoot)) {
      const validRoot = await verifyGenericIssuanceRootValidity(
        semaphoreGroupUrl,
        pcd.claim.merkleRoot
      );

      if (validRoot) {
        genericIssuanceRootCache.add(pcd.claim.merkleRoot);
      } else {
        throw new Error(
          "No allowed roots specified and group is neither the organizer or resident group."
        );
      }
    }
  }

  return pcd.claim.nullifierHash;
}

async function verifyRootValidity(
  groupId: string,
  root: string,
  historicAPI: string
): Promise<boolean> {
  const url = historicAPI + groupId + "/" + root;
  const response = await fetch(url);
  const result = await response.json();
  return result.valid;
}

async function verifyGenericIssuanceRootValidity(
  baseUrl: string,
  root: string
): Promise<boolean> {
  const url = baseUrl + "/valid/" + root;
  const response = await fetch(url);
  const result = await response.json();
  return result.valid;
}
