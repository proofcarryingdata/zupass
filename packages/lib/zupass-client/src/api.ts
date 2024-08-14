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
  put: (path: string, content: SerializedPCD) => Promise<void>;
  delete: (path: string) => Promise<void>;
}

export interface ZupassGPC {
  prove: (args: GPCPCDArgs) => Promise<SerializedPCD>;
}

export interface ZupassAPI {
  _version: "1";
  fs: ZupassFileSystem;
  gpc: ZupassGPC;
}
