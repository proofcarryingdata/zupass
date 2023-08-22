import { PCD, SerializedPCD } from "@pcd/pcd-types";
import * as snapshot from "memfs/lib/snapshot";
import { Volume } from "memfs/lib/volume";
import * as path from "path";
import { PCDPackages } from "./PCDPackages";
import { checkIsDirectory, filesInDirectory, readFiles } from "./util";

export class PCDDisk {
  private pcdPackages: PCDPackages;
  private volume: Volume;

  public constructor(pcdPackages: PCDPackages, volume?: Volume) {
    this.pcdPackages = pcdPackages;
    this.volume = volume ?? new Volume();
  }

  public async insertPCD(pcd: PCD, dir: string): Promise<void> {
    checkIsDirectory(this.volume, dir);

    const pcdPath = path.join(dir, pcd.id);

    if (this.volume.existsSync(pcdPath)) {
      throw new Error(`${pcdPath} already exists`);
    }

    this.volume.writeFileSync(
      pcdPath,
      JSON.stringify(await this.pcdPackages.serialize(pcd))
    );
  }

  public async getPCDsInDirectory(dir: string): Promise<PCD[]> {
    return this.pcdPackages.deserializeAll(
      readFiles(this.volume, filesInDirectory(this.volume, dir)).map(
        (data) => JSON.parse(data) as SerializedPCD
      )
    );
  }

  public getSnapshot() {
    return snapshot.toSnapshotSync({ fs: this.volume });
  }
}
