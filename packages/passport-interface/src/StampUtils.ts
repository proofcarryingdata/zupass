import { createHash } from "crypto";
import { ProveRequest } from "./RequestTypes";

export function hashRequest(req: ProveRequest): string {
  const reqString = JSON.stringify(req);
  return createHash("sha256").update(reqString).digest("hex");
}

export interface PendingStamp {
  pcdType: string;
  hash: string;
  status: StampStatus;
}

export enum StampStatus {
  IN_QUEUE = "in queue",
  NEXT_UP = "next up",
  IN_PROGRESS = "in progress",
  COMPLETE = "complete",
}
