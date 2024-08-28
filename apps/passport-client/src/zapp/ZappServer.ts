import { EmailPCDTypeName } from "@pcd/email-pcd";
import { GPCPCDArgs, GPCPCDPackage, GPCPCDTypeName } from "@pcd/gpc-pcd";
import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { POD } from "@pcd/pod";
import { isPODPCD, PODPCD, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import { p } from "@pcd/podspec";
import {
  ZupassAPISchema,
  ZupassGPC,
  ZupassIdentity,
  ZupassPOD,
  ZupassRPC
} from "@pcd/zupass-client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { StateContextValue } from "../dispatch";
import { EmbeddedScreenType } from "../embedded";
import { ClientChannel } from "./useZappServer";

const ZAPP_POD_SPECIAL_FOLDER_NAME = "PODs from Zapps";

function safeInput<This extends BaseZappServer, Args extends unknown[], Return>(
  parser: z.ZodSchema<Args>
) {
  return function actualDecorator(
    originalMethod: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext
  ): (this: This, ...args: Args) => Return {
    function replacementMethod(this: This, ...args: Args): Return {
      const input = parser.safeParse(args);
      if (!input.success) {
        throw new Error(`Invalid arguments for ${context.name.toString()}`);
      }
      return originalMethod.call(this, ...input.data);
    }

    return replacementMethod;
  };
}

abstract class BaseZappServer {
  constructor(
    private context: StateContextValue,
    private zapp: PODPCD,
    private clientChannel: ClientChannel
  ) {}

  public getZapp(): PODPCD {
    return this.zapp;
  }

  public getContext(): StateContextValue {
    return this.context;
  }

  public getClientChannel(): ClientChannel {
    return this.clientChannel;
  }
}

class GPC extends BaseZappServer implements ZupassGPC {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
  }

  public async prove(args: GPCPCDArgs): Promise<SerializedPCD> {
    const req: PCDGetRequest<typeof GPCPCDPackage> = {
      type: PCDRequestType.Get,
      returnUrl: "",
      args,
      pcdType: GPCPCDTypeName,
      postMessage: false
    };
    this.getClientChannel().showZupass();
    return new Promise((resolve) => {
      this.getContext().dispatch({
        type: "show-embedded-screen",
        screen: {
          type: EmbeddedScreenType.EmbeddedGetRequest,
          request: req,
          callback: (serialized: SerializedPCD) => {
            this.getClientChannel().hideZupass();
            this.getContext().dispatch({
              type: "hide-embedded-screen"
            });
            resolve(serialized);
          }
        }
      });
    });
  }

  public async verify(serialized: SerializedPCD): Promise<boolean> {
    const pcd = await GPCPCDPackage.deserialize(serialized.pcd);
    return GPCPCDPackage.verify(pcd);
  }
}

export class Identity extends BaseZappServer implements ZupassIdentity {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
  }

  public async getSemaphoreV3Commitment(): Promise<bigint> {
    return this.getContext().getState().identity.getCommitment();
  }

  public async getAttestedEmails(): Promise<SerializedPCD[]> {
    const emailPCDs = this.getContext()
      .getState()
      .pcds.getPCDsByType(EmailPCDTypeName);
    return Promise.all(
      emailPCDs.map((pcd) => this.getContext().getState().pcds.serialize(pcd))
    );
  }
}

class PODServer extends BaseZappServer implements ZupassPOD {
  public subscriptionIds: Set<string> = new Set();

  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
  }

  @safeInput(ZupassAPISchema.shape.pod.shape.query.parameters())
  public async query(query: unknown): Promise<string[]> {
    let q;
    try {
      // @todo need a better way of defining the possibly type of the query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = p.deserialize(query as any);
      console.log("querying with ", q);
    } catch (e) {
      console.log(e);
      throw e;
    }
    const allPCDs = this.getContext()
      .getState()
      .pcds.getAllPCDsInFolder(ZAPP_POD_SPECIAL_FOLDER_NAME);
    const pods = allPCDs.filter(isPODPCD).map((pcd) => pcd.pod);

    const result = q.query(pods);

    return result.matches.map((match) => match.serialize());
  }

  @safeInput(ZupassAPISchema.shape.pod.shape.insert.parameters())
  /**
   * Insert a POD into the PCD collection.
   */
  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    const id = uuidv4();
    const podPCD = new PODPCD(id, pod);
    const serializedPCD = await PODPCDPackage.serialize(podPCD);
    this.getContext().dispatch({
      type: "add-pcds",
      // This is probably not where we want to store these, but it's not clear
      // how much the folder concept should be visible to the API.
      // We could add a "meta" parameter which could contain a "zupassFolder"
      // record, for instance, but this begins to couple the API too closely to
      // the specifics of Zupass.
      // In the meantime, however, PODs stored in this way can be retrieved by
      // Zapps using the query API.
      folder: ZAPP_POD_SPECIAL_FOLDER_NAME,
      pcds: [serializedPCD],
      upsert: true
    });
  }

  @safeInput(ZupassAPISchema.shape.pod.shape.delete.parameters())
  /**
   * Delete all PODs with the given signature.
   */
  public async delete(signature: string): Promise<void> {
    const allPCDs = this.getContext()
      .getState()
      // Deletion is restricted to Zapp-created PODs
      .pcds.getAllPCDsInFolder(ZAPP_POD_SPECIAL_FOLDER_NAME);
    // This will delete *all* PODs in the folder which have a matching
    // signature. Since signatures are unique, this seems reasonable. There is
    // probably no good reason to have multiple PODs with the same signature.
    const pcdIds = allPCDs
      .filter(
        (pcd) =>
          pcd.type === PODPCDTypeName &&
          (pcd as PODPCD).proof.signature === signature
      )
      .map((pcd) => pcd.id);

    await Promise.all(
      pcdIds.map((id) =>
        this.getContext().dispatch({
          type: "remove-pcd",
          id
        })
      )
    );
  }

  @safeInput(ZupassAPISchema.shape.pod.shape.subscribe.parameters())
  public async subscribe(query: unknown): Promise<string> {
    // We don't want the listener to keep a strong reference to the server
    // object, as this will prevent it from being garbage collected.
    // Using a WeakRef means that if the ZappServer is dereferenced elsewhere,
    // the listener will not keep it alive.
    const ref = new WeakRef(this);
    let serial = 0;
    let lastResults: string[] = [];
    const subscriptionId = uuidv4();
    this.subscriptionIds.add(subscriptionId);
    const cancel = this.getContext()
      .getState()
      .pcds.changeEmitter.listen(async () => {
        const server = ref.deref();
        if (server && server.subscriptionIds.has(subscriptionId)) {
          // Re-running the query here may not be optimal.
          // A longer-term solution might be to have finer-grained observation
          // of changes to the PCD collection, so that we can know if the
          // results are likely to have changed without re-running the query.
          const newResults = await server.query(query);

          if (
            lastResults.length === newResults.length &&
            lastResults.every((result, index) => result === newResults[index])
          ) {
            return;
          }
          lastResults = newResults;
          this.getClientChannel().subscriptionUpdate(
            {
              update: newResults,
              subscriptionId
            },
            serial
          );
          serial++;
        } else {
          cancel();
        }
      });
    return subscriptionId;
  }

  @safeInput(ZupassAPISchema.shape.pod.shape.unsubscribe.parameters())
  public async unsubscribe(subscriptionId: string): Promise<void> {
    if (this.subscriptionIds.has(subscriptionId)) {
      this.subscriptionIds.delete(subscriptionId);
    } else {
      throw new Error(`Subscription with ID ${subscriptionId} does not exist`);
    }
  }
}

export class ZappServer extends BaseZappServer implements ZupassRPC {
  public gpc: ZupassGPC;
  public identity: ZupassIdentity;
  public pod: ZupassPOD;
  public _version = "1" as const;

  constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
    this.gpc = new GPC(context, zapp, clientChannel);
    this.identity = new Identity(context, zapp, clientChannel);
    this.pod = new PODServer(context, zapp, clientChannel);
  }
}
