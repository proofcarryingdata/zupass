import { EmailPCDTypeName } from "@pcd/email-pcd";
import { GPCPCDArgs, GPCPCDPackage, GPCPCDTypeName } from "@pcd/gpc-pcd";
import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { PODPCD, PODPCDTypeName } from "@pcd/pod-pcd";
import { p } from "@pcd/podspec";
import {
  ZupassAPI,
  ZupassAPISchema,
  ZupassFeeds,
  ZupassFileSystem,
  ZupassFolderContent,
  ZupassGPC,
  ZupassIdentity,
  ZupassPOD
} from "@pcd/zupass-client";
import { z } from "zod";
import { StateContextValue } from "../dispatch";
import { EmbeddedScreenType } from "../embedded";
import { ClientChannel } from "./useZappServer";

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

class FileSystem extends BaseZappServer implements ZupassFileSystem {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
  }

  @safeInput(ZupassAPISchema.shape.fs.shape.list.parameters())
  public async list(path: string): Promise<ZupassFolderContent[]> {
    const state = this.getContext().getState();
    const pcds = state.pcds.getAllPCDsInFolder(path);
    const folders = state.pcds.getFoldersInFolder(path);
    const result: ZupassFolderContent[] = [];

    for (const folder of folders) {
      result.push({
        type: "folder",
        name: folder
      });
    }
    for (const pcd of pcds) {
      result.push({
        type: "pcd",
        id: pcd.id,
        pcdType: pcd.type
      });
    }
    console.log(result);
    return result;
  }

  @safeInput(ZupassAPISchema.shape.fs.shape.get.parameters())
  public async get(path: string): Promise<SerializedPCD> {
    const pathElements = path.split("/");
    // @todo validate path, check permissions
    const pcdId = pathElements.pop();
    if (!pcdId) {
      throw new Error("No PCD ID found in path");
    }
    const pcdCollection = this.getContext().getState().pcds;
    const pcd = pcdCollection.getById(pcdId);
    if (!pcd) {
      throw new Error(`PCD with ID ${pcdId} does not exist`);
    }
    const serializedPCD = pcdCollection.serialize(pcd);

    return serializedPCD;
  }

  @safeInput(ZupassAPISchema.shape.fs.shape.put.parameters())
  public async put(path: string, content: SerializedPCD): Promise<void> {
    // @todo validate path
    console.log("adding ", path, content);
    await this.getContext().dispatch({
      type: "add-pcds",
      folder: path,
      pcds: [content],
      upsert: true
    });
  }

  @safeInput(ZupassAPISchema.shape.fs.shape.delete.parameters())
  public async delete(_path: string): Promise<void> {
    throw new Error("Not implemented");
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
}

export class Feeds extends BaseZappServer implements ZupassFeeds {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
  }

  @safeInput(ZupassAPISchema.shape.feeds.shape.requestAddSubscription)
  public async requestAddSubscription(
    feedUrl: string,
    feedId: string
  ): Promise<void> {
    this.getContext().dispatch({
      type: "show-embedded-screen",
      screen: {
        type: EmbeddedScreenType.EmbeddedAddSubscription,
        feedUrl,
        feedId
      }
    });
    this.getClientChannel().showZupass();
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

  public async getIdentityCommitment(): Promise<bigint> {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = p.deserialize(query as any);
      console.log("querying with ", q);
    } catch (e) {
      console.log(e);
      throw e;
    }
    const allPCDs = this.getContext().getState().pcds.getAll();
    const pods = allPCDs
      .filter((pcd) => pcd.type === PODPCDTypeName)
      .map((pcd) => (pcd as PODPCD).pod);

    const result = q.query(pods);

    return result.matches.map((match) => match.serialize());
  }
}

export class ZappServer extends BaseZappServer implements ZupassAPI {
  public fs: ZupassFileSystem;
  public gpc: ZupassGPC;
  public feeds: ZupassFeeds;
  public identity: ZupassIdentity;
  public pod: ZupassPOD;
  public _version = "1" as const;

  constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ClientChannel
  ) {
    super(context, zapp, clientChannel);
    this.fs = new FileSystem(context, zapp, clientChannel);
    this.gpc = new GPC(context, zapp, clientChannel);
    this.feeds = new Feeds(context, zapp, clientChannel);
    this.identity = new Identity(context, zapp, clientChannel);
    this.pod = new PODServer(context, zapp, clientChannel);
  }
}
