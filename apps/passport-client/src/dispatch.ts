import { Identity } from "@semaphore-protocol/identity";
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

export function dispatch(action: Action) {
  switch (action.type) {
    case "gen-passport":
      genPassport();
      break;
    case "nav-scan-and-verify":
      window.alert("Unimplemented, test prove semaphore instead");
      doProveSemaphore();
      break;
    default:
      console.error("Unknown action type", action);
  }
}

async function genPassport() {
  // Generate a semaphore identity, save it to the local store, generate an
  // email magic link. In prod, send email, in dev, display the link.
  setState({ screen: "gen-passport" });

  // Generate a fresh identity, save in local storage.
  const identity = new Identity();
  console.log("Created identity", identity.toString());
  setState({ identity });
}

let setState = (_: Partial<ZuState>) => {};

export function setSetState(sS: (state: Partial<ZuState>) => void) {
  setState = sS;
}
