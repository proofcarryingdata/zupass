// Note: refactoring to @pcd/passport-interface in the future, especially if
// cross-browser interaction starts to exist outside of passport-client
import { BroadcastChannel } from "broadcast-channel";
import { Action } from "./dispatch";

const CHANNEL_NAME = "zupass_broadcast_channel";
// The event message that prompts other tabs to refresh their local state
const PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE = "password_change_on_other_tab";
const LOGOUT_ON_OTHER_TAB = "logout_on_other_tab";
const LOGIN_ON_OTHER_TAB = "login_on_other_tab";
let channel: BroadcastChannel | null = null;

/**
 * Messages other tabs in the current browser session via the BroadcastChannel
 * that we have updated our password in this tab.
 */
export function notifyPasswordChangeToOtherTabs(): void {
  postOnBroadcastChannel(PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE);
}

/**
 * Messages other tabs in the current browser session via the BroadcastChannel
 * that we have logged in in this tab.
 */
export function notifyLoginToOtherTabs(): void {
  postOnBroadcastChannel(LOGIN_ON_OTHER_TAB);
}

/**
 * Messages other tabs in the current browser session via the BroadcastChannel
 * that we have logged out in this tab.
 */
export function notifyLogoutToOtherTabs(): void {
  postOnBroadcastChannel(LOGOUT_ON_OTHER_TAB);
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
): void {
  if (channel === null) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  channel.onmessage = (msg): void => {
    // NOTE: We're using the "broadcast-channel" package which supports all
    // browsers, not the native BroadcastChannel API.  They have a subtly
    // different interface.  In particular, we get our message directly as an
    // argument here rather than having to look in event.data to find it.
    console.log("[BROADCAST_CHANNEL] Received message", msg);
    if (msg === PASSWORD_CHANGE_ON_OTHER_TAB_MESSAGE) {
      dispatch({
        type: "password-change-on-other-tab"
      });
    } else if (msg === LOGIN_ON_OTHER_TAB || msg === LOGOUT_ON_OTHER_TAB) {
      forceReloadPage();
    } else {
      console.error("BroadcastChannel message has no handler", msg);
    }
  };
}

export function closeBroadcastChannel(): void {
  channel?.close().catch(console.error);
  channel = null;
}

export function postOnBroadcastChannel(eventData: string): void {
  if (channel === null) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    console.error(
      "Channel has not been set up with listener yet, please ensure you have called setupBroadcastChannel()"
    );
  }
  console.log("[BROADCAST_CHANNEL] Posting message", eventData);
  channel.postMessage(eventData).catch(console.error);
}

export function forceReloadPage(): void {
  location.reload();
}
