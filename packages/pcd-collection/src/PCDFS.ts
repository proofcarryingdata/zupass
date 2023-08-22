import { PCDDisk } from "./PCDDisk";
import { PCDIndexer } from "./PCDIndex";

export class PCDFS {
  private disk: PCDDisk;
  private indexer: PCDIndexer;

  public constructor(loadDisk: () => PCDDisk) {
    this.disk = loadDisk();
    this.indexer = PCDIndexer.newIndexer(this.disk);
  }
}
