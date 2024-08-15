import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";

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
  getAllInFolder: (
    path: string,
    recursive: boolean
  ) => Promise<Record<string, SerializedPCD[]>>;
  put: (path: string, content: SerializedPCD) => Promise<void>;
  delete: (path: string) => Promise<void>;
}

export interface ZupassGPC {
  prove: (args: GPCPCDArgs) => Promise<SerializedPCD>;
}

export interface ZupassFeeds {
  requestAddSubscription: (feedUrl: string, feedId: string) => Promise<void>;
  pollFeed: (feedUrl: string, feedId: string) => Promise<void>;
  isSubscribed: (feedUrl: string, feedId: string) => Promise<boolean>;
}

export interface ZupassIdentity {
  getIdentityCommitment: () => Promise<bigint>;
  getAttestedEmails: () => Promise<SerializedPCD[]>;
}

export interface ZupassAPI {
  _version: "1";
  fs: ZupassFileSystem;
  gpc: ZupassGPC;
  feeds: ZupassFeeds;
  identity: ZupassIdentity;
}
