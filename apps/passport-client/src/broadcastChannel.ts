import { Action } from "./dispatch";

const CHANNEL_NAME = "zupass_broadcast_channel";
// The event message that prompts other tabs to refresh their local state
const UPDATE_STATE_MESSAGE = "update_state_on_other_tabs";
let channel: BroadcastChannel | null = null;

/**
 * Force other tabs in the current browser session to load their AppState from
 * the saved localStorage values. This ensures that when we perform actions that
 * change localStorage like changing password, this update is also reflected in
 * the in-browser memory of other tabs within the session.
 */
export function updateStateOnOtherTabs() {
  if (channel === null) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    console.error(
      "Channel has not been set up with listener yet, please ensure you have called setupSaltBroadcast()"
    );
  }
  channel.postMessage(UPDATE_STATE_MESSAGE);
}

/**
 * Initializes the {@link BroadcastChannel} for updating state in other tabs.
 * This is necessary because we want to update the redux state of other tabs
 * in the same browser session, and we'll need to set up a onmessage handler
 * for received events. In the future, we may add more broadcast channels and
 * set up more onmessage handlers.
 */
export function setupBroadcastChannel(
  dispatch: (action: Action) => Promise<void>
) {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data === UPDATE_STATE_MESSAGE) {
      dispatch({
        type: "update-state-from-local-storage"
      });
    }
  };
}

export function closeBroadcastChannel() {
  return channel?.close();
}
