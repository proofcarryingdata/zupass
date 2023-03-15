import { PCD } from "@pcd/pcd-types";

export class PCDCollection {
  private pcds: PCD[] = [];

  public addPCD(pcd: PCD) {
    this.pcds.push(pcd);
  }
}
