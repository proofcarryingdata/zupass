import { Action } from "./dispatch";

let saltChannel: BroadcastChannel | null = null;

export function updateSaltStateOnOtherTabs(salt: string) {
  if (saltChannel != null) {
    saltChannel.postMessage(salt);
  } else {
    console.error("Broadcast channel is not initialized");
  }
}

/**
 *
 * @returns
 */
export function setupSaltBroadcast(
  dispatch: (action: Action) => Promise<void>
) {
  saltChannel = new BroadcastChannel("salt_channel");
  saltChannel.onmessage = (event) => {
    dispatch({
      type: "set-salt",
      salt: event.data
    });
  };
}

export function closeSaltBroadcast() {
  return saltChannel?.close();
}
