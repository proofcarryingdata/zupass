import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";

export class PCDPackages {
  private packages: PCDPackage[];

  public constructor(packages: PCDPackage[]) {
    this.packages = packages;
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

  public async serializeAll(pcds: PCD[]): Promise<SerializedPCD[]> {
    return Promise.all(pcds.map(this.serialize.bind(this)));
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
}
