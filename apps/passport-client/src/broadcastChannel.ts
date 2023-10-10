// Note: refactoring to @pcd/passport-interface in the future, especially if
// cross-browser interaction starts to exist outside of passport-client
import { BroadcastChannel } from "broadcast-channel";
import { Action } from "./dispatch";

const CHANNEL_NAME = "zupass_broadcast_channel";
// The event message that prompts other tabs to refresh their local state
const PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE = "password_change_on_other_tab";
let channel: BroadcastChannel | null = null;

/**
 * Messages other tabs in the current browser session via the BroadcastChannel
 * that we have updated our password in this tab.
 */
export function notifyPasswordChangeOnOtherTabs() {
  if (channel === null) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    console.error(
      "Channel has not been set up with listener yet, please ensure you have called setupBroadcastChannel()"
    );
  }
  channel.postMessage(PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE);
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
  if (channel === null) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  channel.onmessage = (event) => {
    if (event.data === PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE) {
      dispatch({
        type: "password-change-on-other-tab"
      });
    } else {
      console.error("BroadcastChannel event has no handler", event);
    }
  };
}

export function closeBroadcastChannel() {
  return channel?.close();
}
