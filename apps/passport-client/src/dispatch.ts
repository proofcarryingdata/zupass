import { doProveSemaphore } from "./ProveSemaphore";

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

export type ZuState = {
  test: boolean;
};

let setState = (state: ZuState) => {};

// TODO
export function setSetState(sS: (state: ZuState) => void) {
  setState = sS;
}

export function dispatch(action: Action) {
  switch (action.type) {
    case "gen-passport":
      setState({ test: true });
      break;
    case "nav-scan-and-verify":
      window.alert("Unimplemented, test prove semaphore instead");
      doProveSemaphore();
      break;
    default:
      console.error("Unknown action type", action);
  }
}
