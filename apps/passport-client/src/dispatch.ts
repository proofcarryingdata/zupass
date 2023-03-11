import { Identity } from "@semaphore-protocol/identity";
import { createContext } from "react";
import { doProveSemaphore } from "./ProveSemaphore";
import { ZuState } from "./state";

export type Dispatcher = (action: Action) => void;

export type Action =
  | {
      type: "gen-passport";
      body: {
        email: string;
      };
    }
  | {
      type: "nav-scan-and-verify";
    };

export const DispatchContext = createContext<[ZuState, Dispatcher]>([] as any);

export type ZuUpdate = (s: Partial<ZuState>) => void;

export function dispatch(action: Action, state: ZuState, update: ZuUpdate) {
  console.log(`Dispatching ${action.type}`, action);

  switch (action.type) {
    case "gen-passport":
      genPassport(state, update);
      break;
    case "nav-scan-and-verify":
      window.alert("Unimplemented, test prove semaphore instead");
      doProveSemaphore();
      break;
    default:
      console.error("Unknown action type", action);
  }
}

async function genPassport(_: ZuState, update: ZuUpdate) {
  // Generate a semaphore identity, save it to the local store, generate an
  // email magic link. In prod, send email, in dev, display the link.
  update({ screen: "gen-passport" });

  // Generate a fresh identity, save in local storage.
  const identity = new Identity();
  console.log("Created identity", identity.toString());
  update({ identity });
}
