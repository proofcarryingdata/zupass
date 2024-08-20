import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";
import type { GenericSerializedEntriesSpec } from "@pcd/podspec";

type PODQuery = GenericSerializedEntriesSpec;

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
  getAttestedEmails: () => Promise<SerializedPCD[]>;
}

export interface ZupassPOD {
  // Returns array of serialized PODs
  query: (query: PODQuery) => Promise<string[]>;
}

export interface ZupassAPI {
  _version: "1";
  fs: ZupassFileSystem;
  gpc: ZupassGPC;
  feeds: ZupassFeeds;
  identity: ZupassIdentity;
  pod: ZupassPOD;
}
