import { sha256 } from "js-sha256";
import { ProveRequest } from "./RequestTypes";

export function hashRequest(req: ProveRequest): string {
  const reqString = JSON.stringify(req);
  return sha256(reqString);
}

export interface PendingStamp {
  pcdType: string;
  hash: string;
  status: StampStatus;
}

export enum StampStatus {
  IN_QUEUE = "in queue",
  IN_PROGRESS = "in progress",
  COMPLETE = "complete",
}
