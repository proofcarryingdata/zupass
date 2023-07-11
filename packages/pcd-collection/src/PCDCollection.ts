import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";

/**
 * This class represents all the PCDs a user may have, and also
 * contains references to all the relevant {@link PCDPackage}s,
 * which allows this class to effectively make use of all of the
 * PCDs.
 */
export class PCDCollection {
  private packages: PCDPackage[];
  private pcds: PCD<any, any>[];

  public constructor(packages: PCDPackage[], pcds: PCD[]) {
    this.packages = packages;
    this.pcds = pcds;
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

  public async remove(id: string) {
    this.pcds = this.pcds.filter((pcd) => pcd.id !== id);
  }

  public async deserializeAndAdd(
    serialized: SerializedPCD,
    options?: { upsert?: boolean }
  ): Promise<void> {
    await this.deserializeAllAndAdd([serialized], options);
  }

  public async serializeAll(): Promise<SerializedPCD[]> {
    return Promise.all(this.pcds.map(this.serialize.bind(this)));
  }

  public addAll(pcds: PCD[], options?: { upsert?: boolean }) {
    const currentMap = new Map(this.pcds.map((pcd) => [pcd.id, pcd]));
    const toAddMap = new Map(pcds.map((pcd) => [pcd.id, pcd]));

    for (const [id, pcd] of Object.entries(toAddMap)) {
      if (currentMap.has(id) && !options?.upsert) {
        throw new Error(`pcd with id ${id} is already in this collection`);
      }

      currentMap.set(id, pcd);
    }

    this.pcds = Array.from(currentMap.values());
  }

  public getAll(): PCD[] {
    return this.pcds;
  }

  public getAllIds(): string[] {
    return this.getAll().map((pcd) => pcd.id);
  }

  public getUploadId(): string {
    return this.getAllIds().join(",");
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

  public static async deserialize(
    packages: PCDPackage[],
    serializedPCDs: SerializedPCD[]
  ): Promise<PCDCollection> {
    const collection = new PCDCollection(packages, []);
    const pcds: PCD[] = await Promise.all(
      serializedPCDs.map(collection.deserialize.bind(collection))
    );
    collection.addAll(pcds, { upsert: true });
    return collection;
  }
}
