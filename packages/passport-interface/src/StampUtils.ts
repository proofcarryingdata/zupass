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
   * A hash of the ProveRequest using hashRequest. Stored to avoid
   * people re-sending the same request many times and clogging
   * the proving queue.
   */
  hash: string;
}

export enum StampStatus {
  IN_QUEUE = "in queue",
  PROVING = "proving",
  COMPLETE = "complete",
  ERROR = "error",
}
