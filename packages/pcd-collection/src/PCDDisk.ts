import { PCD, SerializedPCD } from "@pcd/pcd-types";
import * as snapshot from "memfs/lib/snapshot";
import { Volume } from "memfs/lib/volume";
import * as path from "path";
import { PCDPackages } from "./PCDPackages";
import {
  checkIsDirectory,
  DeserializedDirectory,
  filesInDirectory,
  readFiles,
  SerializedDirectory,
  snapshotNodeToDirectory
} from "./util";

export class PCDDisk {
  private pcdPackages: PCDPackages;
  private volume: Volume;

  public constructor(pcdPackages: PCDPackages, volume?: Volume) {
    this.pcdPackages = pcdPackages;
    this.volume = volume ?? new Volume();
  }

  public mkdirp(dir: string): void {
    this.volume.mkdirSync(dir, { recursive: true });
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

  public getSerializedSnapshot(): SerializedDirectory {
    const node = snapshot.toSnapshotSync({ fs: this.volume });
    return snapshotNodeToDirectory("/", node) as SerializedDirectory;
  }

  public async deserializeSnapshot(
    directory: SerializedDirectory
  ): Promise<DeserializedDirectory> {
    return {
      childDirectories: await Promise.all(
        directory.childDirectories.map((d) => this.deserializeSnapshot(d))
      ),
      path: directory.path,
      pcds: await this.pcdPackages.deserializeAll(directory.pcds)
    };
  }
}
