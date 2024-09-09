import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";
import { GenericSerializedPodspecPOD } from "@pcd/podspec";

type PODQuery = GenericSerializedPodspecPOD;

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

export interface ZupassFileSystem {
  list: (path: string) => Promise<ZupassFolderContent[]>;
  get: (path: string) => Promise<SerializedPCD>;
  put: (path: string, content: SerializedPCD) => Promise<void>;
  // Not yet implemented:
  delete: (path: string) => Promise<void>;
}

export interface ZupassGPC {
  prove: (args: GPCPCDArgs) => Promise<SerializedPCD>;
}

export interface ZupassFeeds {
  requestAddSubscription: (feedUrl: string, feedId: string) => Promise<void>;
}

export interface ZupassIdentity {
  getIdentityCommitment: () => Promise<bigint>;
  // Should be PODs rather than SerializedPCDs in future
  getAttestedEmails: () => Promise<SerializedPCD[]>;
}

export interface ZupassPOD {
  // Returns array of serialized PODs
  query: (query: PODQuery) => Promise<string[]>;
  insert: (serializedPod: string) => Promise<void>;
  delete: (signature: string) => Promise<void>;
}

export interface ZupassAPI {
  _version: "1";
  // Flagged as optional and is effectively deprecated
  fs?: ZupassFileSystem;
  gpc: ZupassGPC;
  // Flagged as optional and is effectively deprecated
  feeds?: ZupassFeeds;
  identity: ZupassIdentity;
  pod: ZupassPOD;
}
