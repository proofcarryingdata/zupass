import { SerializedPCD } from "@pcd/pcd-types";
import { PODPCD } from "@pcd/pod-pcd";
import {
  ZupassAPI,
  ZupassFileSystem,
  ZupassFolderContent
} from "@pcd/zupass-client";
import { z } from "zod";
import { StateContextValue } from "../dispatch";

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
    private zapp: PODPCD
  ) {}

  public getZapp(): PODPCD {
    return this.zapp;
  }

  public getContext(): StateContextValue {
    return this.context;
  }
}

class FileSystem extends BaseZappServer implements ZupassFileSystem {
  public constructor(context: StateContextValue, zapp: PODPCD) {
    super(context, zapp);
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
      pcds: [content]
    });
  }

  @safeInput(z.tuple([z.string()]))
  public async delete(path: string): Promise<void> {}
}

export class ZappServer extends BaseZappServer implements ZupassAPI {
  public fs: ZupassFileSystem;
  public _version = "1" as const;

  constructor(context: StateContextValue, zapp: PODPCD) {
    super(context, zapp);
    this.fs = new FileSystem(context, zapp);
  }
}
