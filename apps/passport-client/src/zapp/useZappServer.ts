import { listen } from "@parcnet-js/client-helpers/connection/iframe";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { encodePrivateKey } from "@pcd/pod";
import { isPODPCD, PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStateContext } from "../appHooks";
import { StateContextValue } from "../dispatch";
import { ZupassRPCProcessor } from "./ZappServer";

export enum ListenMode {
  LISTEN_IF_EMBEDDED,
  LISTEN_IF_NOT_EMBEDDED
}

async function waitForAuthentication(
  context: StateContextValue
): Promise<void> {
  return new Promise<void>((resolve) => {
    const unlisten = context.stateEmitter.listen((state) => {
      if (state.self) {
        unlisten();
        resolve();
      }
    });
  });
}

export function useZappServer(mode: ListenMode): void {
  const context = useStateContext();

  useEffect(() => {
    if (
      mode === ListenMode.LISTEN_IF_EMBEDDED &&
      window.parent === window.self
    ) {
      return;
    }
    if (
      mode === ListenMode.LISTEN_IF_NOT_EMBEDDED &&
      window.parent !== window.self
    ) {
      return;
    }
    (async (): Promise<void> => {
      const { zapp, advice, origin } = await listen();
      context.dispatch({ type: "zapp-connect", zapp, origin });
      if (mode === ListenMode.LISTEN_IF_EMBEDDED && !context.getState().self) {
        // If we're not logged in, we need to show a message to the user
        window.location.hash = "connect-popup";
        advice.showClient();
        await waitForAuthentication(context);
        advice.hideClient();
      }

      const zapps = context.getState().pcds.getAllPCDsInFolder("Zapps");
      let zappPOD = zapps.filter(isPODPCD).find((zapp) => {
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

      let approved = !!zappPOD;

      if (!zappPOD) {
        // @todo show a modal instead of using confirm
        approved = confirm(
          `Allow ${zapp.name} at ${origin} to connect to your Zupass account?\r\n\r\nThis is HIGHLY EXPERIMENTAL - make sure you trust this website.`
        );
        if (approved) {
          const newZapp = (await PODPCDPackage.prove({
            entries: {
              argumentType: ArgumentTypeName.Object,
              value: {
                origin: { type: "string", value: origin },
                name: { type: "string", value: zapp.name }
              }
            },
            privateKey: {
              argumentType: ArgumentTypeName.String,
              value: encodePrivateKey(
                Buffer.from(
                  v3tov4Identity(context.getState().identityV3).export(),
                  "base64"
                )
              )
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
          zappPOD = newZapp;
        } else {
          return;
        }
      }
      if (approved) {
        const server = new ZupassRPCProcessor(context, zappPOD, advice);

        // @todo handle this with an action
        context.update({ embeddedScreen: undefined });
        if (window.parent !== window.self) {
          window.location.hash = "embedded";
        }

        advice.ready(server);
      }
    })();
  }, [context, mode]);
}
