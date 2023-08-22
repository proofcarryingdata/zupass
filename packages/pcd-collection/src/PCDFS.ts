import { PCD } from "@pcd/pcd-types";
import { PCDDisk } from "./PCDDisk";
import { PCDIndexer } from "./PCDIndex";

export class PCDFS {
  private disk: PCDDisk;
  private indexer: PCDIndexer;

  public constructor(loadDisk: () => PCDDisk) {
    this.disk = loadDisk();
    this.indexer = PCDIndexer.newIndexer(this.disk);
  }

  public insertPCD(pcd: PCD, dir: string): void {
    this.disk.insertPCD(pcd, dir);
  }

  public getPCDsInDirectory(dir: string): Promise<PCD[]> {
    return this.disk.getPCDsInDirectory(dir);
  }
}
