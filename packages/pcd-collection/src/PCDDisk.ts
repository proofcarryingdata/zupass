import { PCD, SerializedPCD } from "@pcd/pcd-types";
import * as snapshot from "memfs/lib/snapshot";
import { SnapshotNode } from "memfs/lib/snapshot";
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

  public getSnapshot(): Promise<Directory | undefined> {
    const node = snapshot.toSnapshotSync({ fs: this.volume });
    return this.snapshotNodeToDirectory("/", node);
  }

  public async snapshotNodeToDirectory(
    nodePath: string,
    node: SnapshotNode
  ): Promise<Directory | undefined> {
    if (!node) {
      return undefined;
    }

    if (node[0] !== 0 /* folder */) {
      return undefined;
    }

    const entryList = Object.entries(node[2]);

    return {
      path: nodePath,
      pcds: (
        await Promise.all(
          entryList.map(([k, v]) => {
            return this.snapshotNodeToFile(v);
          })
        )
      ).filter((pcd) => !!pcd) as PCD[],
      childDirectories: (
        await Promise.all(
          entryList.map(([k, v]) => {
            return this.snapshotNodeToDirectory(path.join(nodePath, k), v);
          })
        )
      ).filter((dir) => !!dir) as Directory[]
    };
  }

  public async snapshotNodeToFile(
    node: SnapshotNode
  ): Promise<PCD | undefined> {
    if (!node) {
      return undefined;
    }

    if (node[0] !== 1 /* file */) {
      return undefined;
    }

    const stringFileContents = Buffer.from(node[2]).toString("utf-8");
    const serializedPCD = JSON.parse(stringFileContents) as SerializedPCD;

    return this.pcdPackages.deserialize(serializedPCD);
  }
}

export interface Directory {
  path: string;
  pcds: PCD[];
  childDirectories: Directory[];
}
