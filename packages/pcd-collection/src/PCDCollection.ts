import { Emitter } from "@pcd/emitter";
import { getHash } from "@pcd/passport-crypto";
import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { getFoldersInFolder, isRootFolder } from "./util";

/**
 * This class represents all the PCDs a user may have, and also
 * contains references to all the relevant {@link PCDPackage}s,
 * which allows this class to effectively make use of all of the
 * PCDs.
 */
export class PCDCollection {
  /**
   * Emits an event whenever the hash of this {@link PCDCollection} changes.
   */
  public readonly hashEmitter: Emitter<string>;

  private packages: PCDPackage[];
  private pcds: PCD<any, any>[];
  public folders: Record<string, string>; // pcd id -> folder

  public constructor(
    packages: PCDPackage[],
    pcds?: PCD[],
    folders?: Record<string, string>
  ) {
    this.packages = packages;
    this.pcds = pcds ?? [];
    this.folders = folders ?? {};
    this.hashEmitter = new Emitter();
  }

  public getFoldersInFolder(folderPath: string): string[] {
    return getFoldersInFolder(folderPath, Object.values(this.folders));
  }

  public setPCDFolder(pcdId: string, folder: string): void {
    if (!this.hasPCDWithId(pcdId)) {
      throw new Error(`can't set folder of pcd ${pcdId} - pcd doesn't exist`);
    }

    this.folders[pcdId] = folder;
    this.recalculateAndEmitHash();
  }

  public getFolderOfPCD(pcdId: string): string | undefined {
    if (!this.hasPCDWithId(pcdId)) {
      return undefined;
    }

    return Object.entries(this.folders).find(
      ([id, _folder]) => pcdId === id
    )?.[1];
  }

  public getAllPCDsInFolder(folder: string): PCD[] {
    if (isRootFolder(folder)) {
      const pcdIdsInFolders = new Set([...Object.keys(this.folders)]);
      const pcdsNotInFolders = this.pcds.filter(
        (pcd) => !pcdIdsInFolders.has(pcd.id)
      );
      return pcdsNotInFolders;
    }

    const pcdIds = Object.entries(this.folders)
      .filter(([_pcdId, f]) => f === folder)
      .map(([pcdId, _f]) => pcdId);

    return this.getByIds(pcdIds);
  }

  public removeAllPCDsInFolder(folder: string): void {
    const inFolder = this.getAllPCDsInFolder(folder);
    inFolder.forEach((pcd) => this.remove(pcd.id));
  }

  public replacePCDsInFolder(folder: string, pcds: PCD[]): void {
    this.removeAllPCDsInFolder(folder);
    this.addAll(pcds, { upsert: true });
    pcds.forEach((pcd) => this.setPCDFolder(pcd.id, folder));
  }

  public getPackage<T extends PCDPackage = PCDPackage>(
    name: string
  ): T | undefined {
    const matching = this.packages.find((p) => p.name === name);
    return matching as T | undefined;
  }

  public hasPackage(name: string): boolean {
    return this.packages.find((p) => p.name === name) !== undefined;
  }

  public async serialize(pcd: PCD): Promise<SerializedPCD> {
    const pcdPackage = this.getPackage(pcd.type);
    if (!pcdPackage) throw new Error(`no package matching ${pcd.type}`);
    const serialized = await pcdPackage.serialize(pcd);
    return serialized;
  }

  public async serializeAll(): Promise<SerializedPCD[]> {
    return Promise.all(this.pcds.map(this.serialize.bind(this)));
  }

  public async serializeCollection(): Promise<string> {
    return JSON.stringify({
      pcds: await Promise.all(this.pcds.map(this.serialize.bind(this))),
      folders: this.folders
    } satisfies SerializedPCDCollection);
  }

  public async deserialize(serialized: SerializedPCD): Promise<PCD> {
    const pcdPackage = this.getPackage(serialized.type);
    if (!pcdPackage) throw new Error(`no package matching ${serialized.type}`);
    const deserialized = await pcdPackage.deserialize(serialized.pcd);
    return deserialized;
  }

  public async deserializeAll(serialized: SerializedPCD[]): Promise<PCD[]> {
    return Promise.all(serialized.map(this.deserialize.bind(this)));
  }

  public async deserializeAllAndAdd(
    serialized: SerializedPCD[],
    options?: { upsert?: boolean }
  ): Promise<void> {
    const deserialized = await this.deserializeAll(serialized);
    this.addAll(deserialized, options);
  }

  public async remove(pcdId: string) {
    this.pcds = this.pcds.filter((pcd) => pcd.id !== pcdId);
    this.folders = Object.fromEntries(
      Object.entries(this.folders).filter(([id]) => id !== pcdId)
    );
    this.recalculateAndEmitHash();
  }

  public async deserializeAndAdd(
    serialized: SerializedPCD,
    options?: { upsert?: boolean }
  ): Promise<void> {
    await this.deserializeAllAndAdd([serialized], options);
  }

  public add(pcd: PCD, options?: { upsert?: boolean }) {
    this.addAll([pcd], options);
  }

  public addAll(pcds: PCD[], options?: { upsert?: boolean }) {
    const currentMap = new Map(this.pcds.map((pcd) => [pcd.id, pcd]));
    const toAddMap = new Map(pcds.map((pcd) => [pcd.id, pcd]));

    for (const [id, pcd] of toAddMap.entries()) {
      if (currentMap.has(id) && !options?.upsert) {
        throw new Error(`pcd with id ${id} is already in this collection`);
      }

      currentMap.set(id, pcd);
    }

    this.pcds = Array.from(currentMap.values());
    this.recalculateAndEmitHash();
  }

  public size(): number {
    return this.pcds.length;
  }

  public getAll(): PCD[] {
    return this.pcds;
  }

  public getAllIds(): string[] {
    return this.getAll().map((pcd) => pcd.id);
  }

  public getByIds(ids: string[]): PCD[] {
    return this.pcds.filter(
      (pcd) => ids.find((id) => pcd.id === id) !== undefined
    );
  }

  /**
   * Generates a unique hash based on the contents. This hash changes whenever
   * the set of pcds, or the contents of the pcds changes.
   */
  public async getHash(): Promise<string> {
    const allSerialized = await this.serializeCollection();
    const hashed = await getHash(allSerialized);
    return hashed;
  }

  public getById(id: string): PCD | undefined {
    return this.pcds.find((pcd) => pcd.id === id);
  }

  public hasPCDWithId(id: string): boolean {
    return this.getById(id) !== undefined;
  }

  public getPCDsByType(type: string) {
    return this.pcds.filter((pcd) => pcd.type === type);
  }

  private recalculateAndEmitHash() {
    this.getHash().then((newHash) => this.hashEmitter.emit(newHash));
  }

  public static async deserialize(
    packages: PCDPackage[],
    serialized: string
  ): Promise<PCDCollection> {
    const parsed = JSON.parse(serialized) as Partial<SerializedPCDCollection>;
    const collection = new PCDCollection(packages, []);

    const serializedPcdsList = parsed.pcds ?? [];
    const parsedFolders = parsed.folders ?? {};

    const pcds: PCD[] = await Promise.all(
      serializedPcdsList.map(collection.deserialize.bind(collection))
    );
    collection.addAll(pcds, { upsert: true });
    collection.folders = parsedFolders;

    return collection;
  }
}

/**
 * {@link PCDCollection#serializeCollection} returns a stringified instance
 * of this interface, and {@link PCDCollection.deserialize} takes a stringified
 * instance of this object and returns a new {@link PCDCollection}.
 */
export interface SerializedPCDCollection {
  pcds: SerializedPCD[];
  folders: Record<string, string>;
}
