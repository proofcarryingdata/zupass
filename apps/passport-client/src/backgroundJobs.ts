import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useStateContext } from "./appHooks";
import {
  closeBroadcastChannel,
  setupBroadcastChannel
} from "./broadcastChannel";
import { saveUsingLaserScanner } from "./localstorage";
import { pollUser } from "./user";

export function useBackgroundJobs(): void {
  const { update, getState, dispatch } = useStateContext();

  useEffect(() => {
    let activePollTimeout: NodeJS.Timeout | undefined = undefined;
    let lastBackgroundPoll = 0;
    const BG_POLL_INTERVAL_MS = 1000 * 60;

    /**
     * Idempotently enables or disables periodic polling of jobPollServerUpdates,
     * based on whether the window is visible or invisible.
     *
     * If there is an existing poll scheduled, it will not be rescheduled,
     * but may be cancelled.  If there is no poll scheduled, a new one may be
     * scheduled.  It may happen immediately after the window becomes visible,
     * but never less than than BG_POLL_INTERVAL_MS after the previous poll.
     */
    const setupPolling = (): void => {
      if (!document.hidden) {
        if (!activePollTimeout) {
          const nextPollDelay = Math.max(
            0,
            lastBackgroundPoll + BG_POLL_INTERVAL_MS - Date.now()
          );
          activePollTimeout = setTimeout(jobPollServerUpdates, nextPollDelay);
          console.log(
            `[JOB] next poll for updates scheduled in ${nextPollDelay}ms`
          );
        }
      } else {
        if (activePollTimeout) {
          clearTimeout(activePollTimeout);
          activePollTimeout = undefined;
          console.log("[JOB] poll for updates disabled");
        }
      }
    };

    /**
     * Periodic job for polling the server.  Is scheduled by setupPolling, and
     * will reschedule itself in the same way.
     */
    const jobPollServerUpdates = (): void => {
      // Mark that poll has started.
      console.log("[JOB] polling server for updates");
      activePollTimeout = undefined;
      try {
        // Do the real work of the poll.
        doPollServerUpdates();
      } finally {
        // Reschedule next poll.
        lastBackgroundPoll = Date.now();
        setupPolling();
      }
    };

    const doPollServerUpdates = async (): Promise<void> => {
      const state = getState();
      if (
        !state.self ||
        !!state.userInvalid ||
        !!state.anotherDeviceChangedPassword
      ) {
        console.log("[JOB] skipping poll with invalid user");
        return;
      }

      // Check for updates to User object.
      try {
        await pollUser(state.self, dispatch);
      } catch (e) {
        console.log("[JOB] failed poll user", e);
      }

      // Trigger extra download from E2EE storage, and extra fetch of
      // subscriptions, but only if the first-time sync had time to complete.
      if (state.completedFirstSync) {
        update({
          extraDownloadRequested: true,
          extraSubscriptionFetchRequested: true
        });
      }
    };

    const jobCheckConnectivity = async (): Promise<void> => {
      window.addEventListener("offline", () => setIsOffline(true));
      window.addEventListener("online", () => setIsOffline(false));
    };

    const setIsOffline = (offline: boolean): void => {
      console.log(`[CONNECTIVITY] ${offline ? "offline" : "online"}`);
      update({
        offline: offline
      });
      if (offline) {
        toast("Offline", {
          icon: "❌",
          style: {
            width: "80vw"
          }
        });
      } else {
        toast("Back Online", {
          icon: "👍",
          style: {
            width: "80vw"
          }
        });
      }
    };

    const startBackgroundJobs = (): void => {
      console.log("[JOB] Starting background jobs...");
      document.addEventListener("visibilitychange", () => {
        setupPolling();
      });
      setupPolling();
      jobCheckConnectivity();
    };

    setupBroadcastChannel(dispatch);
    setupUsingLaserScanning().then(() => {
      startBackgroundJobs();
    });

    return () => {
      closeBroadcastChannel();
    };
  });
}

/**
 * To set up usingLaserScanning local storage, which turns off the camera
 * on the scan screen so the laser scanner can be used. This flag will be
 * exclusively used on the Devconnect laser scanning devices.
 */
async function setupUsingLaserScanning(): Promise<void> {
  const queryParams = new URLSearchParams(window.location.search.slice(1));
  const laserQueryParam = queryParams.get("laser");
  if (laserQueryParam === "true") {
    await saveUsingLaserScanner(true);
  } else if (laserQueryParam === "false") {
    // We may want to use this to forcibly make this state false
    await saveUsingLaserScanner(false);
  }
}
