import { sha256 } from "js-sha256";
import { ProveRequest } from "./RequestTypes";

export function hashRequest(req: ProveRequest): string {
  const reqString = JSON.stringify(req);
  return sha256(reqString);
}

export interface PendingStamp {
  status: StampStatus;

  /**
   * The type of PCD that a server is producing a stamp for.
   */
  pcdType: string;

  /**
   * A hash of the ProveRequest using hashRequest
   */
  hash: string;
}

export enum StampStatus {
  IN_QUEUE = "in queue",
  PROVING = "proving",
  COMPLETE = "complete",
}
