import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";

export class PCDCollection {
  private packages: PCDPackage[];
  private pcds: PCD[];

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

  public static async deserialize(
    packages: PCDPackage[],
    serializedPCDs: SerializedPCD[]
  ): Promise<PCDCollection> {
    const collection = new PCDCollection(packages, []);
    const pcds = await Promise.all(
      serializedPCDs.map(collection.deserialize.bind(collection))
    );
    collection.addAll(pcds);
    return collection;
  }
}
