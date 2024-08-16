import { ArgumentTypeName } from "@pcd/pcd-types";
import { isPODPCD, PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import {
  postWindowMessage,
  RPCMessageSchema,
  RPCMessageType,
  WindowMessageType
} from "@pcd/zupass-client";
import { ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStateContext } from "../../../src/appHooks";
import { StateContextValue } from "../../../src/dispatch";
import { EmbeddedUIControl, setupPort } from "../../../src/zapp/useZappServer";
import { ZappServer } from "../../../src/zapp/ZappServer";

// In real usage, this would be the user's Semaphore v4 key
const MAGIC_PRIVATE_KEY =
  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff";

async function connectToZapp(
  zappWindow: Window,
  context: StateContextValue
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return new Promise((resolve) => {
    console.log("Zapp loaded");
    const chan = new MessageChannel();

    const setupListener = async (event: MessageEvent): Promise<void> => {
      const port = chan.port2;
      const msg = RPCMessageSchema.parse(event.data);
      if (msg.type === RPCMessageType.ZUPASS_CLIENT_CONNECT) {
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
          context.update({ embeddedScreen: undefined });
          port.removeEventListener("message", setupListener);
          setupPort(port, server);
          port.postMessage({
            type: RPCMessageType.ZUPASS_CLIENT_READY
          });
          resolve();
        }
      } else {
        console.log(
          "Unexpected message while waiting for ZUPASS_CLIENT_CONNECT",
          msg.type
        );
      }
    };
    chan.port2.addEventListener("message", setupListener);
    chan.port2.start();
    postWindowMessage(
      zappWindow,
      {
        type: WindowMessageType.ZUPASS_HOST_CONNECT
      },
      "*",
      [chan.port1]
    );
  });
}

export function ZappScreen(): ReactNode {
  const context = useStateContext();
  return (
    <iframe
      style={{ width: "100%", height: "100%", borderRadius: "10px" }}
      onLoad={(ev) => {
        connectToZapp(
          (ev.target as HTMLIFrameElement).contentWindow as Window,
          context
        );
      }}
      src="http://localhost:3200/"
      sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms"
    />
  );
}
