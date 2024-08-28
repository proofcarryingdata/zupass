import { GPCPCD, GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { ZupassAPI, ZupassFileSystem, ZupassIdentity } from "./api_internal";

class ZupassAPIPODWrapper {
  #api: ZupassAPI;
  constructor(api: ZupassAPI) {
    this.#api = api;
  }

  async query(query: ReturnType<typeof p.pod>): Promise<POD[]> {
    const serialized = query.serialize();
    const pods = await this.#api.pod.query(serialized);
    return pods.map((pod) => POD.deserialize(pod));
  }

  async insert(pod: POD): Promise<void> {
    const serialized = pod.serialize();
    return this.#api.pod.insert(serialized);
  }

  async delete(signature: string): Promise<void> {
    return this.#api.pod.delete(signature);
  }
}

class ZupassGPCWrapper {
  #api: ZupassAPI;
  constructor(api: ZupassAPI) {
    this.#api = api;
  }

  // In a world with POD2, we would use new POD2 types rather than GPCPCD.
  // The existing args system and GPC wrapper works well, so we can use that.
  async prove(args: GPCPCDArgs): Promise<GPCPCD> {
    const serialized = await this.#api.gpc.prove(args);
    return GPCPCDPackage.deserialize(serialized.pcd);
  }

  async verify(pcd: GPCPCD): Promise<boolean> {
    const serialized = await GPCPCDPackage.serialize(pcd);
    return this.#api.gpc.verify(serialized);
  }
}
/**
 * Wraps the internal Zupass API to provide a more user-friendly interface.
 * Specifically, this handles serialization and deserialization of PODs and
 * query data.
 */
export class ZupassAPIWrapper {
  #api: ZupassAPI;
  public pod: ZupassAPIPODWrapper;
  public identity: ZupassIdentity;
  public gpc: ZupassGPCWrapper;
  public fs?: ZupassFileSystem;
  // Feeds API is deliberately omitted
  constructor(api: ZupassAPI) {
    this.#api = api;
    this.pod = new ZupassAPIPODWrapper(api);
    this.identity = api.identity;
    this.gpc = new ZupassGPCWrapper(api);
    this.fs = api.fs;
  }
}
