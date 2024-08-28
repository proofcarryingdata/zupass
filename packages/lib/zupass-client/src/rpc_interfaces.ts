import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";
import { GenericSerializedPodspecPOD } from "@pcd/podspec";

export type PODQuery = GenericSerializedPodspecPOD;

export type ZupassFolderContent =
  | {
      type: "folder";
      name: string;
    }
  | {
      type: "pcd";
      id: string;
      pcdType: SerializedPCD["type"];
    };

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
  // Returns array of serialized PODs
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
