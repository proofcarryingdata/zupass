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

  public getPackage(name: string): PCDPackage {
    const matching = this.packages.find((p) => p.name === name);

    if (matching === undefined) {
      throw new Error(`no package matching ${name}`);
    }

    return matching;
  }

  public hasPackage(name: string): boolean {
    return this.packages.find((p) => p.name === name) !== undefined;
  }

  public async serialize(pcd: PCD): Promise<SerializedPCD> {
    const pcdPackage = this.getPackage(pcd.type);
    const serialized = await pcdPackage.serialize(pcd);
    return serialized;
  }

  public async deserialize(serialized: SerializedPCD): Promise<PCD> {
    const pcdPackage = this.getPackage(serialized.type);
    const deserialized = await pcdPackage.deserialize(serialized.pcd);
    return deserialized;
  }

  public async deserializeAll(serialized: SerializedPCD[]): Promise<PCD[]> {
    return Promise.all(serialized.map(this.deserialize.bind(this)));
  }

  public async deserializeAllAndAdd(
    serialized: SerializedPCD[]
  ): Promise<void> {
    const deserialized = await this.deserializeAll(serialized);
    this.addAll(deserialized);
  }

  public async deserializeAndAdd(serialized: SerializedPCD): Promise<void> {
    await this.deserializeAllAndAdd([serialized]);
  }

  public async serializeAll(): Promise<SerializedPCD[]> {
    return Promise.all(this.pcds.map(this.serialize.bind(this)));
  }

  public addAll(pcds: PCD[]) {
    this.pcds.push(...pcds);
  }

  public getAll(): PCD[] {
    return this.pcds;
  }

  public getById(id: string): PCD | undefined {
    return this.pcds.find((pcd) => pcd.id === id);
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
    collection.addAll(pcds);
    return collection;
  }
}
