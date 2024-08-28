import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";
import { GenericSerializedPodspecPOD } from "@pcd/podspec";

/**
 * @file This file contains the RPC interfaces for the Zupass client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

export type PODQuery = GenericSerializedPodspecPOD;

export interface SubscriptionResult {
  subscriptionId: string;
  update: string[];
}

export interface ZupassGPC {
  prove: (args: GPCPCDArgs) => Promise<SerializedPCD>;
  verify: (pcd: SerializedPCD) => Promise<boolean>;
}

export interface ZupassIdentity {
  getSemaphoreV3Commitment: () => Promise<bigint>;
}

export interface ZupassPOD {
  query: (query: PODQuery) => Promise<string[]>;
  insert: (serializedPod: string) => Promise<void>;
  delete: (signature: string) => Promise<void>;
  subscribe: (query: PODQuery) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
}

export interface ZupassRPC {
  _version: "1";
  gpc: ZupassGPC;
  identity: ZupassIdentity;
  pod: ZupassPOD;
}

export interface ZupassEvents {
  on: (
    event: "subscription-update",
    callback: (result: SubscriptionResult) => void
  ) => void;
}
