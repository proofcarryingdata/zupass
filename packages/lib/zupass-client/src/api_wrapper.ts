import { GPCPCD, GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { EventEmitter } from "eventemitter3";
import { ZupassRPCClient } from "./rpc_client";
import { ZupassIdentity, ZupassRPC } from "./rpc_interfaces";

type QueryType = ReturnType<typeof p.pod>;

export class Subscription {
  #emitter: EventEmitter;
  #query: QueryType;
  #api: ZupassAPIPODWrapper;

  constructor(
    query: QueryType,
    emitter: EventEmitter,
    api: ZupassAPIPODWrapper
  ) {
    this.#emitter = emitter;
    this.#query = query;
    this.#api = api;
  }

  async query(): Promise<POD[]> {
    return this.#api.query(this.#query);
  }

  on(event: "update", callback: (result: POD[]) => void): void {
    this.#emitter.on("update", callback);
  }

  off(event: "update", callback: (result: POD[]) => void): void {
    this.#emitter.off("update", callback);
  }
}

class ZupassAPIPODWrapper {
  #api: ZupassRPCClient;
  #subscriptionEmitters: Map<string, EventEmitter>;

  constructor(api: ZupassRPCClient) {
    this.#api = api;
    this.#subscriptionEmitters = new Map();
    this.#api.on("subscription-update", (result) => {
      const emitter = this.#subscriptionEmitters.get(result.subscriptionId);
      if (emitter) {
        emitter.emit(
          "update",
          result.update.map((pod) => POD.deserialize(pod))
        );
      }
    });
  }

  async query(query: ReturnType<typeof p.pod>): Promise<POD[]> {
    const serialized = query.serialize();
    const pods = await this.#api.pod.query(serialized);
    return pods.map((pod) => POD.deserialize(pod));
  }

  async subscribe(query: ReturnType<typeof p.pod>): Promise<Subscription> {
    const serialized = query.serialize();
    const subscriptionId = await this.#api.pod.subscribe(serialized);
    const emitter = new EventEmitter();
    const subscription = new Subscription(query, emitter, this);
    this.#subscriptionEmitters.set(subscriptionId, emitter);
    return subscription;
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
  #api: ZupassRPC;
  constructor(api: ZupassRPC) {
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
export class ZupassAPI {
  #api: ZupassRPCClient;
  public pod: ZupassAPIPODWrapper;
  public identity: ZupassIdentity;
  public gpc: ZupassGPCWrapper;

  constructor(api: ZupassRPCClient) {
    this.#api = api;
    this.pod = new ZupassAPIPODWrapper(api);
    this.identity = api.identity;
    this.gpc = new ZupassGPCWrapper(api);
  }
}
