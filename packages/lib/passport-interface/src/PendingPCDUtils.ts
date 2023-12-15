import { sha256 } from "js-sha256";
import { ServerProofRequest } from "./RequestTypes";

export function hashProveRequest(req: ServerProofRequest): string {
  const reqString = JSON.stringify(req);
  return sha256(reqString);
}

export interface PendingPCD {
  /**
   * Current status of the pending PCD using PendingPCDStatus enum.
   */
  status: PendingPCDStatus;

  /**
   * The type of PCD that a server is producing a proof for.
   */
  pcdType: string;

  /**
   * A hash of the ProveRequest using hashProveRequest. Stored to avoid
   * people re-sending the same request many times and clogging
   * the proving queue.
   */
  hash: string;
}

export enum PendingPCDStatus {
  QUEUED = "queued",
  PROVING = "proving",
  COMPLETE = "complete",
  ERROR = "error",
  NONE = "none"
}

export function isSettledPendingPCDStatus(status: PendingPCDStatus) {
  return [
    PendingPCDStatus.ERROR,
    PendingPCDStatus.COMPLETE,
    PendingPCDStatus.NONE
  ].includes(status);
}
