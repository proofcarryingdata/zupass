import { ArgumentTypeName } from "@pcd/pcd-types";
import { isPODPCD, PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";
import {
  deepGet,
  postRPCMessage,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  WindowMessageSchema,
  WindowMessageType
} from "@pcd/zupass-client";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStateContext } from "../appHooks";
import { StateContextValue } from "../dispatch";
import { ZappEmbeddingMode, ZappScreenState } from "../embedded";
import { ZappServer } from "./ZappServer";

export interface UIControl {
  showScreen(embeddedScreen: ZappScreenState): void;
  hideScreen(): void;
}

export class EmbeddingUIControl implements UIControl {
  constructor(private context: StateContextValue) {}

  public showScreen(embeddedScreen: ZappScreenState): void {
    if (embeddedScreen.screen) {
      this.context.dispatch({
        type: "show-embedded-screen",
        screen: embeddedScreen.screen
      });
    }
  }

  public hideScreen(): void {
    this.context.dispatch({
      type: "hide-embedded-screen"
    });
  }
}

export class EmbeddedUIControl implements UIControl {
  constructor(
    private port: MessagePort,
    private context: StateContextValue
  ) {}

  public showScreen(embeddedScreen: ZappScreenState): void {
    this.port.postMessage({
      type: RPCMessageType.ZUPASS_CLIENT_SHOW
    });
    this.context.dispatch({
      type: "show-embedded-screen",
      screen: embeddedScreen.screen
    });
  }

  public hideScreen(): void {
    this.port.postMessage({
      type: RPCMessageType.ZUPASS_CLIENT_HIDE
    });
    this.context.dispatch({
      type: "hide-embedded-screen"
    });
  }
}

export function setupPort(port: MessagePort, server: ZappServer): void {
  port.addEventListener("message", async (event) => {
    console.log(`SERVER RECEIVED ${event.data.type}`);
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
      try {
        if (functionToInvoke && typeof functionToInvoke === "function") {
          console.log("invoking function", functionToInvoke, message.args);
          try {
            const result = await functionToInvoke.apply(object, message.args);
            console.log(result);
            port.postMessage({
              type: RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT,
              result,
              serial: message.serial
            } satisfies RPCMessage);
          } catch (e) {
            port.postMessage({
              type: RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR,
              serial: message.serial,
              error: getErrorMessage(e)
            } satisfies RPCMessage);
          }
        } else {
          throw new Error("Function not found");
        }
      } catch (error) {
        console.error("Error invoking function", error);
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
    window.addEventListener("message", async (event) => {
      let port: MessagePort;
      // @todo: handle repeat calls?
      console.log(event);
      const data = WindowMessageSchema.safeParse(event.data);
      if (!data.success) {
        return;
      }
      const msg = data.data;
      console.log("passport-client received message ", msg);
      if (msg.type === WindowMessageType.ZUPASS_CLIENT_CONNECT) {
        const origin = event.origin;
        port = event.ports[0];
        port.start();

        if (!context.getState().self) {
          console.log("user not logged in");
          // User is not logged in
          postRPCMessage(port, {
            type: RPCMessageType.ZUPASS_CLIENT_SHOW
          });

          await new Promise<void>((resolve) => {
            const unlisten = context.stateEmitter.listen((state) => {
              if (state.self) {
                postRPCMessage(port, {
                  type: RPCMessageType.ZUPASS_CLIENT_HIDE
                });
                unlisten();
                resolve();
              }
            });
          });
        }

        const zapps = context.getState().pcds.getAllPCDsInFolder("Zapps");
        let zapp = zapps.filter(isPODPCD).find((zapp) => {
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
        });

        let approved = !!zapp;

        if (!zapp) {
          approved = confirm(
            `Allow ${msg.zapp.name} at ${origin} to connect to your Zupass account?\r\n\r\nThis is HIGHLY EXPERIMENTAL - make sure you trust this website.`
          );
          if (approved) {
            const newZapp = (await PODPCDPackage.prove({
              entries: {
                argumentType: ArgumentTypeName.Object,
                value: {
                  origin: { type: "string", value: origin },
                  name: { type: "string", value: msg.zapp.name }
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
            })) as PODPCD;
            const newZappSerialized = await PODPCDPackage.serialize(newZapp);
            context.dispatch({
              type: "add-pcds",
              pcds: [newZappSerialized],
              folder: "Zapps"
            });
            zapp = newZapp;
          } else {
            return;
          }
        }
        if (approved) {
          const uiControl = new EmbeddedUIControl(port, context);
          const server = new ZappServer(context, zapp, uiControl);

          // @todo handle this with an action
          context.update({
            embeddedScreen: undefined,
            zappEmbeddingMode: ZappEmbeddingMode.ZupassInsideZapp
          });
          window.location.hash = "embedded";

          setupPort(port, server);
          port.postMessage({
            type: RPCMessageType.ZUPASS_CLIENT_READY
          });
        }
      }
    });
  }, [context]);
}
