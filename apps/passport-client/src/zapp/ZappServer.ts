import { EmailPCDTypeName } from "@pcd/email-pcd";
import { GPCPCDArgs, GPCPCDPackage, GPCPCDTypeName } from "@pcd/gpc-pcd";
import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { PODPCD } from "@pcd/pod-pcd";
import {
  ZupassAPI,
  ZupassFeeds,
  ZupassFileSystem,
  ZupassFolderContent,
  ZupassGPC,
  ZupassIdentity
} from "@pcd/zupass-client";
import { z } from "zod";
import { StateContextValue } from "../dispatch";
import { EmbeddedScreenType, ZappScreenState } from "../embedded";
import { UIControl } from "./useZappServer";

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
    private uiControl: UIControl
  ) {}

  public getZapp(): PODPCD {
    return this.zapp;
  }

  public getContext(): StateContextValue {
    return this.context;
  }

  public getUIControl(): UIControl {
    return this.uiControl;
  }
}

class FileSystem extends BaseZappServer implements ZupassFileSystem {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    uiControl: UIControl
  ) {
    super(context, zapp, uiControl);
  }

  @safeInput(z.tuple([z.string()]))
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

  @safeInput(z.tuple([z.string()]))
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

  @safeInput(
    z.tuple([z.string(), z.object({ pcd: z.string(), type: z.string() })])
  )
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

  @safeInput(z.tuple([z.string()]))
  public async delete(_path: string): Promise<void> {
    throw new Error("Not implemented");
  }
}

class GPC extends BaseZappServer implements ZupassGPC {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    uiControl: UIControl
  ) {
    super(context, zapp, uiControl);
  }

  public async prove(args: GPCPCDArgs): Promise<SerializedPCD> {
    const req: PCDGetRequest<typeof GPCPCDPackage> = {
      type: PCDRequestType.Get,
      returnUrl: "",
      args,
      pcdType: GPCPCDTypeName,
      postMessage: false
    };
    return new Promise((resolve) => {
      const screenState: ZappScreenState = {
        screen: {
          type: EmbeddedScreenType.EmbeddedGetRequest,
          request: req,
          callback: (serialized: SerializedPCD): void => {
            this.getUIControl().hideScreen();
            resolve(serialized);
          }
        }
      };
      console.log("showing zapp modal", screenState);
      this.getUIControl().showScreen(screenState);
    });
  }
}

export class Feeds extends BaseZappServer implements ZupassFeeds {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    uiControl: UIControl
  ) {
    super(context, zapp, uiControl);
  }

  @safeInput(z.tuple([z.string(), z.string()]))
  public async requestAddSubscription(
    feedUrl: string,
    feedId: string
  ): Promise<void> {
    this.getUIControl().showScreen({
      screen: {
        type: EmbeddedScreenType.EmbeddedAddSubscription,
        feedUrl,
        feedId
      }
    });
  }
}

export class Identity extends BaseZappServer implements ZupassIdentity {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    uiControl: UIControl
  ) {
    super(context, zapp, uiControl);
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

export class ZappServer extends BaseZappServer implements ZupassAPI {
  public fs: ZupassFileSystem;
  public gpc: ZupassGPC;
  public feeds: ZupassFeeds;
  public identity: ZupassIdentity;
  public _version = "1" as const;

  constructor(context: StateContextValue, zapp: PODPCD, uiControl: UIControl) {
    super(context, zapp, uiControl);
    this.fs = new FileSystem(context, zapp, uiControl);
    this.gpc = new GPC(context, zapp, uiControl);
    this.feeds = new Feeds(context, zapp, uiControl);
    this.identity = new Identity(context, zapp, uiControl);
  }
}
