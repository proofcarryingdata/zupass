import { PCD } from "@pcd/pcd-types";
import Dirent from "memfs/lib/Dirent";
import { TDataOut } from "memfs/lib/encoding";
import { Volume } from "memfs/lib/volume";
import { PCDPackages } from "./PCDPackages";

export function isDirent(value: TDataOut | Dirent): value is Dirent {
  return (value as any)?.isDirectory !== undefined;
}

export class PCDFileSystem {
  private pcdPackages: PCDPackages;
  private volume: Volume;

  public constructor(pcdPackages: PCDPackages, volume?: Volume) {
    this.pcdPackages = pcdPackages;
    this.volume = volume ?? new Volume();
  }

  public async addPCD(path: string, pcd: PCD): Promise<void> {
    this.volume.writeFileSync(
      path,
      JSON.stringify(await this.pcdPackages.serialize(pcd))
    );
  }

  // public async getPcdsInDirectory(path: string): Promise<PCD[]> {
  //   const entries = this.volume.readdirSync(path);
  //   const pcdFiles: Dirent[] = [];

  //   for (const entry of entries) {
  //     if (isDirent(entry)) {
  //       if (entry.isFile()) {
  //         pcdFiles.push(entry);
  //       }
  //     }
  //   }
  // }
}
