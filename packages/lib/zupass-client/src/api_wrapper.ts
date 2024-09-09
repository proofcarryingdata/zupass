import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import {
  ZupassAPI,
  ZupassFileSystem,
  ZupassGPC,
  ZupassIdentity
} from "./api_internal";

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

/**
 * Wraps the internal Zupass API to provide a more user-friendly interface.
 * Specifically, this handles serialization and deserialization of PODs and
 * query data.
 */
export class ZupassAPIWrapper {
  #api: ZupassAPI;
  public pod: ZupassAPIPODWrapper;
  public identity: ZupassIdentity;
  public gpc: ZupassGPC;
  public fs?: ZupassFileSystem;
  // Feeds API is deliberately omitted
  constructor(api: ZupassAPI) {
    this.#api = api;
    this.pod = new ZupassAPIPODWrapper(api);
    this.identity = api.identity;
    this.gpc = api.gpc;
    this.fs = api.fs;
  }
}
