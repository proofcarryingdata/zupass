import { PCD, SerializedPCD } from "@pcd/pcd-types";
import Dirent from "memfs/lib/Dirent";
import { Volume } from "memfs/lib/volume";
import * as path from "path";
import { PCDPackages } from "./PCDPackages";

export function isDirent(value: unknown): value is Dirent {
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

  public async getPcdsInDirectory(directoryPath: string): Promise<PCD[]> {
    const fileNames = this.getFileNamesInDirectory(directoryPath);
    const filePaths = fileNames.map((name) => path.join(directoryPath, name));
    const fileDatas = filePaths.map((path) =>
      this.volume.readFileSync(path, { encoding: "utf-8" }).toString()
    );
    const asSerializedPCDs = fileDatas.map((data) =>
      JSON.parse(data)
    ) as SerializedPCD[];
    return this.pcdPackages.deserializeAll(asSerializedPCDs);
  }

  public getFileNamesInDirectory(directoryPath: string): string[] {
    const entries: unknown[] = this.volume.readdirSync(directoryPath, {
      withFileTypes: true
    });
    const fileEntries: Dirent[] = entries.filter(
      (e) => isDirent(e) && e.isFile()
    ) as Dirent[];
    return fileEntries.map((e) => e.name.toString());
  }
}
