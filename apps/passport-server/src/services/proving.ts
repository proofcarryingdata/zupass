import {
  ProveRequest,
  ProveResponse,
  SupportedPCDsResponse,
  VerifyRequest,
  VerifyResponse,
} from "passport-interface";
import { PCDPackage } from "pcd-types";
import { SemaphoreGroupPCDPackage } from "semaphore-group-pcd";

/**
 * Each PCD type that the proving server supports has to go into this array.
 */
const packages: PCDPackage[] = [SemaphoreGroupPCDPackage];

export function prove(proveRequest: ProveRequest): ProveResponse {}

export function verify(verifyRequest: VerifyRequest): VerifyResponse {}

export function getSupportedPCDTypes(): SupportedPCDsResponse {
  return {
    names: packages.map((p) => p.name),
  };
}
