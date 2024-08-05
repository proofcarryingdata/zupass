import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { isPODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";
import {
  deepGet,
  RPCMessageSchema,
  RPCMessageType,
  WindowMessageSchema,
  WindowMessageType,
  ZupassAPI,
  ZupassFileSystem,
  ZupassFolderContent
} from "@pcd/zupass-client";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStateContext } from "./appHooks";
import { StateContextValue } from "./dispatch";

function setupPort(port: MessagePort, server: RPCServer): void {
  port.addEventListener("message", async (event) => {
    console.log(event.data);
    const message = RPCMessageSchema.parse(event.data);
    if (message.type === RPCMessageType.ZUPASS_CLIENT_INVOKE) {
      const path = message.fn.split(".");
      const functionName = path.pop();
      if (!functionName) {
        throw new Error("Path does not contain a function name");
      }
      const object = deepGet(server, path);
      const functionToInvoke = (object as Record<string, unknown>)[
        functionName
      ];
      console.log(object);
      try {
        if (functionToInvoke && typeof functionToInvoke === "function") {
          console.log("invoking function");
          try {
            const result = await functionToInvoke.apply(object, message.args);
            console.log(result);
            port.postMessage({
              type: RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT,
              result,
              serial: message.serial
            });
          } catch (e) {
            console.log(e);
          }
        } else {
          throw new Error("Function not found");
        }
      } catch (error) {
        port.postMessage({
          type: RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR,
          error: getErrorMessage(error)
        });
      }
    }
  });
}

// In real usage, this would be the user's Semaphore v4 key
const MAGIC_PRIVATE_KEY =
  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff";

export function useZappServer(): void {
  const context = useStateContext();

  useEffect(() => {
    const server = new RPCServer(context);
    window.addEventListener("message", async (event) => {
      let port: MessagePort;
      // @todo: handle repeat calls?
      const message = WindowMessageSchema.parse(event.data);
      if (message.type === WindowMessageType.ZUPASS_CLIENT_CONNECT) {
        const origin = event.origin;
        const state = context.getState();
        const zapps = state.pcds.getAllPCDsInFolder("Zapps");
        const zapp = zapps.find((zapp) => {
          if (isPODPCD(zapp)) {
            return Object.entries(zapp.claim.entries).find(([key, entry]) => {
              if (
                key === "origin" &&
                entry.type === "string" &&
                entry.value === origin
              ) {
                return true;
              }
              return false;
            });
          }
        });

        let approved = !!zapp;

        if (!approved) {
          approved = confirm(
            `Allow ${message.zapp.name} to connect to Zupass?`
          );
          const newZapp = await PODPCDPackage.prove({
            entries: {
              argumentType: ArgumentTypeName.Object,
              value: {
                origin: { type: "string", value: origin },
                name: { type: "string", value: message.zapp.name }
              }
            },
            privateKey: {
              argumentType: ArgumentTypeName.String,
              value: MAGIC_PRIVATE_KEY
            },
            id: {
              argumentType: ArgumentTypeName.String,
              value: uuidv4()
            }
          });
          const newZappSerialized = await PODPCDPackage.serialize(newZapp);
          context.dispatch({
            type: "add-pcds",
            pcds: [newZappSerialized],
            folder: "Zapps"
          });
        }
        if (approved) {
          port = event.ports[0];
          setupPort(port, server);
          port.start();
          port.postMessage({
            type: WindowMessageType.ZUPASS_CLIENT_READY
          });
        }
      }
    });
  }, [context]);
}

class FileSystem implements ZupassFileSystem {
  public constructor(private context: StateContextValue) {}

  public async list(path: string): Promise<ZupassFolderContent[]> {
    const state = this.context.getState();
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

  public async get(path: string): Promise<SerializedPCD> {
    return { type: "pcd", pcd: "" };
  }

  public async put(path: string, content: SerializedPCD): Promise<void> {}

  public async delete(path: string): Promise<void> {}
}

class RPCServer implements ZupassAPI {
  public fs: ZupassFileSystem;

  constructor(context: StateContextValue) {
    this.fs = new FileSystem(context);
  }
}
