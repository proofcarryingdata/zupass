import { PCD } from "@pcd/pcd-types";
import { PCDDisk } from "./PCDDisk";

export interface DirNode {
  name: string;
  children: DirNode[];
}

export interface PCDIndex {
  pcdsByID: Map<string, PCD>;
  pcdsByDirectory: Map<string, PCD>;
}

export class PCDIndexer {
  public index: PCDIndex;

  public constructor(index: PCDIndex) {
    this.index = index;
  }

  public static newIndexer(disk: PCDDisk): PCDIndexer {
    const index: PCDIndex = {
      pcdsByDirectory: new Map(),
      pcdsByID: new Map()
    };

    return new PCDIndexer(index);
  }
}
