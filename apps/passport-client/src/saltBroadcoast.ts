import { Action } from "./dispatch";

const SALT_CHANNEL_NAME = "salt_channel";
let saltChannel: BroadcastChannel | null = null;

export function updateSaltStateOnOtherTabs(salt: string) {
  if (saltChannel === null) {
    saltChannel = new BroadcastChannel(SALT_CHANNEL_NAME);
    console.error(
      "Channel has not been set up with listener yet, please ensure you have called setupSaltBroadcast()"
    );
  }
  saltChannel.postMessage(salt);
}

/**
 * Initializes the BroadcastChannel for updating salt values.
 * This is necessary because we want to update the salt in the
 * redux state of other tabs in the same browser session.
 */
export function setupSaltBroadcast(
  dispatch: (action: Action) => Promise<void>
) {
  saltChannel = new BroadcastChannel(SALT_CHANNEL_NAME);
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
