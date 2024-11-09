import { listen } from "@parcnet-js/client-helpers/connection/iframe";
import { PermissionRequestSchema, Zapp } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { $s } from "@parcnet-js/podspec/pod_value_utils";
import { isPODPCD } from "@pcd/pod-pcd";
import { isEqual } from "lodash";
import { useEffect } from "react";
import * as v from "valibot";
import { useStateContext } from "../appHooks";
import { StateContextValue } from "../dispatch";
import { useSyncE2EEStorage } from "../useSyncE2EEStorage";
import { ZupassRPCProcessor } from "./ZappServer";

export enum ListenMode {
  LISTEN_IF_EMBEDDED,
  LISTEN_IF_NOT_EMBEDDED
}

async function waitForAuthentication(
  context: StateContextValue
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const unlisten = context.stateEmitter.listen((state) => {
      if (state.self) {
        unlisten();
        resolve();
      }
      if (state.zappApproved !== undefined && state.zappApproved === false) {
        unlisten();
        reject(new Error("User cancelled connection"));
      }
    });
  });
}

async function waitForFirstSync(context: StateContextValue): Promise<void> {
  return new Promise<void>((resolve) => {
    if (
      context.getState().downloadedPCDs &&
      context.getState().pcds.getAllPCDsInFolder("Devcon SEA").length > 0
    ) {
      resolve();
      return;
    }
    const unlisten = context.stateEmitter.listen((state) => {
      if (
        context.getState().downloadedPCDs &&
        context.getState().pcds.getAllPCDsInFolder("Devcon SEA").length > 0
      ) {
        resolve();
        return;
      }
      if (state.completedFirstSync) {
        unlisten();
        resolve();
      }
    });
  });
}

async function waitForPermissionApproval(
  context: StateContextValue
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const unlisten = context.stateEmitter.listen((state) => {
      if (state.zappApproved !== undefined) {
        unlisten();
        resolve(state.zappApproved);
      }
    });
  });
}

function isAlreadyAuthorized(
  context: StateContextValue,
  zapp: Zapp,
  origin: string
): boolean {
  const zapps = context.getState().pcds.getAllPCDsInFolder("Zapps");
  const zappPODs = zapps.filter(isPODPCD).map((pcd) => pcd.pod);

  const appPodSpec = p.pod({
    entries: {
      origin: {
        type: "string",
        isMemberOf: [$s(origin)]
      },
      name: {
        type: "string",
        isMemberOf: [$s(zapp.name)]
      },
      permissions: {
        type: "string"
      }
    }
  });

  const existingPODQuery = appPodSpec.query(zappPODs);
  if (existingPODQuery.matches.length === 1) {
    try {
      const existingPermissions = v.parse(
        PermissionRequestSchema,
        JSON.parse(
          existingPODQuery.matches[0].content.asEntries().permissions.value
        )
      );
      if (isEqual(existingPermissions, zapp.permissions)) {
        return true;
      }
    } catch (e) {
      console.error("Error parsing permissions", e);
    }
  }
  return false;
}

export function useZappServer(mode: ListenMode): void {
  const context = useStateContext();
  useSyncE2EEStorage();

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
      console.log("zapp", zapp);
      console.log("origin", origin);
      context.dispatch({ type: "zapp-connect", zapp, origin });
      if (mode === ListenMode.LISTEN_IF_EMBEDDED && !context.getState().self) {
        // If we're not logged in, we need to show a message to the user
        window.location.hash = "connect-popup";
        advice.showClient();
        try {
          await waitForAuthentication(context);
        } catch (e) {
          advice.hideClient();
          advice.cancel();
          return;
        }
        advice.hideClient();
      }

      await waitForFirstSync(context);

      let approved = false;

      if (isAlreadyAuthorized(context, zapp, origin)) {
        approved = true;
      }

      if (mode === ListenMode.LISTEN_IF_NOT_EMBEDDED) {
        approved = true;
        await context.dispatch({ type: "zapp-approval", approved });
      } else {
        if (!approved) {
          window.location.hash = "approve-permissions";
          advice.showClient();
          approved = await waitForPermissionApproval(context);
          advice.hideClient();

          if (!approved) {
            throw new Error("User did not approve Zapp permissions");
          }
        }
      }

      const server = new ZupassRPCProcessor(context, advice);

      // @todo handle this with an action
      context.update({
        embeddedScreen: { screen: undefined },
        listenMode: mode
      });
      if (window.parent !== window.self) {
        window.location.hash = "embedded";
      }

      advice.ready(server);
    })();
  }, [context, mode]);
}
