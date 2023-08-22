import { PCD, PCDPackage } from "@pcd/pcd-types";
import { Volume } from "memfs/lib/volume";

export class PCDFileSystem {
  private pcdPackages: PCDPackage[];
  private volume: Volume;

  public constructor(pcdPackages: PCDPackage[], volume?: Volume) {
    this.pcdPackages = pcdPackages;
    this.volume = volume ?? new Volume();
  }

  public addPCD(path: string, pcd: PCD) {}
}
