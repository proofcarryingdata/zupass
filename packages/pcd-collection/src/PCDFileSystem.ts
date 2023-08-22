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

  public async addPCD(directoryPath: string, pcd: PCD): Promise<void> {
    const isDirectory = this.volume.statSync(directoryPath).isDirectory();

    if (!isDirectory) {
      throw new Error(`${directoryPath} is not a directory`);
    }

    const pcdPath = path.join(directoryPath, pcd.id);

    if (this.volume.existsSync(pcdPath)) {
      throw new Error(`${pcdPath} already exists`);
    }

    this.volume.writeFileSync(
      pcdPath,
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

  private getFileNamesInDirectory(directoryPath: string): string[] {
    const entries: unknown[] = this.volume.readdirSync(directoryPath, {
      withFileTypes: true
    });
    const fileEntries: Dirent[] = entries.filter(
      (e) => isDirent(e) && e.isFile()
    ) as Dirent[];
    return fileEntries.map((e) => e.name.toString());
  }

  private getDirectoryNamesInDirectory(directoryPath: string): string[] {
    const entries: unknown[] = this.volume.readdirSync(directoryPath, {
      withFileTypes: true
    });
    const fileEntries: Dirent[] = entries.filter(
      (e) => isDirent(e) && e.isDirectory()
    ) as Dirent[];
    return fileEntries.map((e) => e.name.toString());
  }
}
