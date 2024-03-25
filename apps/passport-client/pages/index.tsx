import {
  createStorageBackedCredentialCache,
  requestOfflineTickets,
  requestOfflineTicketsCheckin
} from "@pcd/passport-interface";
import { isWebAssemblySupported } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "react-hot-toast";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { AddSubscriptionScreen } from "../components/screens/AddSubscriptionScreen";
import { ChangePasswordScreen } from "../components/screens/ChangePasswordScreen";
import { EnterConfirmationCodeScreen } from "../components/screens/EnterConfirmationCodeScreen";
import { FrogManagerScreen } from "../components/screens/FrogScreens/FrogManagerScreen";
import { FrogSubscriptionScreen } from "../components/screens/FrogScreens/FrogSubscriptionScreen";
import { GetWithoutProvingScreen } from "../components/screens/GetWithoutProvingScreen";
import { HaloScreen } from "../components/screens/HaloScreen/HaloScreen";
import { HomeScreen } from "../components/screens/HomeScreen/HomeScreen";
import { ImportBackupScreen } from "../components/screens/ImportBackupScreen";
import { AlreadyRegisteredScreen } from "../components/screens/LoginScreens/AlreadyRegisteredScreen";
import { CreatePasswordScreen } from "../components/screens/LoginScreens/CreatePasswordScreen";
import { LoginInterstitialScreen } from "../components/screens/LoginScreens/LoginInterstitialScreen";
import { LoginScreen } from "../components/screens/LoginScreens/LoginScreen";
import { NewPassportScreen } from "../components/screens/LoginScreens/NewPassportScreen";
import { PrivacyNoticeScreen } from "../components/screens/LoginScreens/PrivacyNoticeScreen";
import { SyncExistingScreen } from "../components/screens/LoginScreens/SyncExistingScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NoWASMScreen } from "../components/screens/NoWASMScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { DevconnectCheckinByIdScreen } from "../components/screens/ScannedTicketScreens/DevconnectCheckinByIdScreen";
import { PodboxScannedTicketScreen } from "../components/screens/ScannedTicketScreens/PodboxScannedTicketScreen/PodboxScannedTicketScreen";
import { SecondPartyTicketVerifyScreen } from "../components/screens/ScannedTicketScreens/SecondPartyTicketVerifyScreen";
import { ServerErrorScreen } from "../components/screens/ServerErrorScreen";
import { SubscriptionsScreen } from "../components/screens/SubscriptionsScreen";
import { TermsScreen } from "../components/screens/TermsScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { useTsParticles } from "../components/shared/useTsParticles";
import { appConfig } from "../src/appConfig";
import {
  closeBroadcastChannel,
  setupBroadcastChannel
} from "../src/broadcastChannel";
import { getOrGenerateCheckinCredential } from "../src/checkin";
import {
  Action,
  StateContext,
  StateContextValue,
  dispatch
} from "../src/dispatch";
import { Emitter } from "../src/emitter";
import {
  loadCheckedInOfflineDevconnectTickets,
  loadEncryptionKey,
  loadIdentity,
  loadOfflineTickets,
  loadPCDs,
  loadPersistentSyncStatus,
  loadSelf,
  loadSubscriptions,
  saveCheckedInOfflineTickets,
  saveIdentity,
  saveOfflineTickets,
  saveUsingLaserScanner
} from "../src/localstorage";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppState, StateEmitter } from "../src/state";
import { pollUser } from "../src/user";
import { validateAndLogInitialAppState } from "../src/validateState";

function useLoadAppState(): [
  AppState | undefined,
  React.Dispatch<React.SetStateAction<AppState | undefined>>
] {
  const [appState, setAppState] = useState<AppState | undefined>(undefined);
  useEffect(() => {
    loadInitialState().then((state) => setAppState(state));
  });

  return [appState, setAppState];
}

function App(): JSX.Element | null {
  const [state, setAppState] = useLoadAppState();

  if (!state) {
    return null;
  }

  return <MainApp state={state} setAppState={setAppState} />;
}

function MainApp({
  state,
  setAppState
}: {
  state: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState | undefined>>;
}): JSX.Element {
  const stateEmitter: StateEmitter = useMemo(() => new Emitter(), []);

  const update = useMemo(
    () =>
      (diff: Partial<AppState>): void => {
        setAppState({ ...state, ...diff });
      },
    [setAppState, state]
  );

  useEffect(() => {
    stateEmitter.emit(state);
  }, [state, stateEmitter]);

  const actionDispatch = useMemo(
    () =>
      (action: Action): Promise<void> =>
        dispatch(action, state, update),
    [state, update]
  );

  const stateContextState: StateContextValue = {
    getState: () => state,
    stateEmitter: stateEmitter,
    dispatch: actionDispatch,
    update: update
  };

  const startBackgroundJobs = useMemo(() => {
    let activePollTimeout: NodeJS.Timeout | undefined = undefined;
    const BG_POLL_INTERVAL_MS = 1000 * 60;
    let lastBackgroundPoll = 0;
    /**
     * Idempotently enables or disables periodic polling of jobPollServerUpdates,
     * based on whether the window is visible or invisible.
     *
     * If there is an existing poll scheduled, it will not be rescheduled,
     * but may be cancelled.  If there is no poll scheduled, a new one may be
     * scheduled.  It may happen immediately after the window becomes visible,
     * but never less than than BG_POLL_INTERVAL_MS after the previous poll.
     */
    const setupPolling = async (): Promise<void> => {
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

    const generateCheckinCredential = async (): Promise<void> => {
      // This ensures that the check-in credential is pre-cached before the
      // first check-in attempt.
      try {
        if (!state?.identity) {
          throw new Error("Missing identity");
        }
        await getOrGenerateCheckinCredential(state.identity);
      } catch (e) {
        console.log("Could not get or generate checkin credential:", e);
      }
    };

    const jobCheckConnectivity = async (): Promise<void> => {
      window.addEventListener("offline", () => setIsOffline(true));
      window.addEventListener("online", () => setIsOffline(false));
    };

    /**
     * Periodic job for polling the server.  Is scheduled by setupPolling, and
     * will reschedule itself in the same way.
     */
    const jobPollServerUpdates = async (): Promise<void> => {
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
        await pollUser(state.self, actionDispatch);
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

    const startJobSyncOfflineCheckins = async (): Promise<void> => {
      await jobSyncOfflineCheckins();
      setInterval(jobSyncOfflineCheckins, 1000 * 60);
    };

    const jobSyncOfflineCheckins = async (): Promise<void> => {
      if (!state.self || state.offline) {
        return;
      }

      if (state.checkedinOfflineDevconnectTickets.length > 0) {
        const checkinOfflineTicketsResult = await requestOfflineTicketsCheckin(
          appConfig.zupassServer,
          {
            checkedOfflineInDevconnectTicketIDs:
              state.checkedinOfflineDevconnectTickets.map((t) => t.id),
            checkerProof: await getOrGenerateCheckinCredential(state.identity)
          }
        );

        if (checkinOfflineTicketsResult.success) {
          update({
            checkedinOfflineDevconnectTickets: []
          });
          saveCheckedInOfflineTickets(undefined);
        }
      }

      const offlineTicketsResult = await requestOfflineTickets(
        appConfig.zupassServer,
        {
          checkerProof: await getOrGenerateCheckinCredential(state.identity)
        }
      );

      if (offlineTicketsResult.success) {
        update({
          offlineTickets: offlineTicketsResult.value.offlineTickets
        });
        saveOfflineTickets(offlineTicketsResult.value.offlineTickets);
      }
    };

    return (): void => {
      console.log("[JOB] Starting background jobs...");
      document.addEventListener("visibilitychange", () => {
        setupPolling();
      });
      setupPolling();
      startJobSyncOfflineCheckins();
      jobCheckConnectivity();
      generateCheckinCredential();
    };
  }, [actionDispatch, state, update]);

  useEffect(() => {
    setupBroadcastChannel(actionDispatch);
    setupUsingLaserScanning();
    startBackgroundJobs();

    return () => {
      closeBroadcastChannel();
    };
  }, [actionDispatch, startBackgroundJobs]);

  const hasStack = !!state.error?.stack;
  return (
    <StateContext.Provider value={stateContextState}>
      {!isWebAssemblySupported() ? (
        <HashRouter>
          <Routes>
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="*" element={<NoWASMScreen />} />
          </Routes>
        </HashRouter>
      ) : !hasStack ? (
        <Router />
      ) : (
        <HashRouter>
          <Routes>
            <Route path="*" element={<AppContainer bg="gray" />} />
          </Routes>
        </HashRouter>
      )}
    </StateContext.Provider>
  );
}

const Router = React.memo(RouterImpl);

function RouterImpl(): JSX.Element {
  useTsParticles();

  return (
    <HashRouter>
      <Routes>
        <Route path="/">
          <Route path="terms" element={<TermsScreen />} />
          <Route index element={<HomeScreen />} />
          <Route path="login" element={<LoginScreen />} />
          <Route
            path="login-interstitial"
            element={<LoginInterstitialScreen />}
          />
          <Route
            path="already-registered"
            element={<AlreadyRegisteredScreen />}
          />
          <Route path="sync-existing" element={<SyncExistingScreen />} />
          <Route path="privacy-notice" element={<PrivacyNoticeScreen />} />
          <Route path="create-password" element={<CreatePasswordScreen />} />
          <Route path="change-password" element={<ChangePasswordScreen />} />
          <Route
            path="enter-confirmation-code"
            element={<EnterConfirmationCodeScreen />}
          />
          <Route path="new-passport" element={<NewPassportScreen />} />
          <Route
            path="get-without-proving"
            element={<GetWithoutProvingScreen />}
          />
          <Route path="halo" element={<HaloScreen />} />
          <Route path="add" element={<AddScreen />} />
          <Route path="prove" element={<ProveScreen />} />
          <Route path="scan" element={<ScanScreen />} />
          {/* This route is used by non-Devconnect tickets */}
          <Route path="verify" element={<SecondPartyTicketVerifyScreen />} />
          {/* This route is used to check in a Devconnect ticket with only
              the ticket ID in the parameters */}
          <Route
            path="checkin-by-id"
            element={<DevconnectCheckinByIdScreen />}
          />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="add-subscription" element={<AddSubscriptionScreen />} />
          <Route path="telegram" element={<HomeScreen />} />
          <Route path="pond-control" element={<FrogManagerScreen />} />
          <Route path="frogscriptions" element={<FrogSubscriptionScreen />} />
          <Route
            path="frogscriptions/:feedCode"
            element={<FrogSubscriptionScreen />}
          />
          <Route path="server-error" element={<ServerErrorScreen />} />
          <Route path="import" element={<ImportBackupScreen />} />
          <Route
            path="generic-checkin"
            element={<PodboxScannedTicketScreen />}
          />
          <Route path="*" element={<MissingScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

/**
 * To set up usingLaserScanning local storage, which turns off the camera
 * on the scan screen so the laser scanner can be used. This flag will be
 * exclusively used on the Devconnect laser scanning devices.
 */
function setupUsingLaserScanning(): void {
  const queryParams = new URLSearchParams(window.location.search.slice(1));
  const laserQueryParam = queryParams.get("laser");
  if (laserQueryParam === "true") {
    saveUsingLaserScanner(true);
  } else if (laserQueryParam === "false") {
    // We may want to use this to forcibly make this state false
    saveUsingLaserScanner(false);
  }
}

// TODO: move to a separate file
async function loadInitialState(): Promise<AppState> {
  let identity = loadIdentity();

  if (!identity) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs(self);
  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();
  const offlineTickets = loadOfflineTickets();
  const checkedInOfflineDevconnectTickets =
    loadCheckedInOfflineDevconnectTickets();

  let modal = { modalType: "none" } as AppState["modal"];

  if (
    // If on Zupass legacy login, ask user to set password
    self &&
    !encryptionKey &&
    !self.salt
  ) {
    console.log("Asking existing user to set a password");
    modal = { modalType: "upgrade-account-modal" };
  }

  const credentialCache = createStorageBackedCredentialCache();

  const persistentSyncStatus = loadPersistentSyncStatus();

  const state: AppState = {
    self,
    encryptionKey,
    pcds,
    identity,
    modal,
    subscriptions,
    resolvingSubscriptionId: undefined,
    credentialCache,
    offlineTickets,
    checkedinOfflineDevconnectTickets: checkedInOfflineDevconnectTickets,
    offline: !window.navigator.onLine,
    serverStorageRevision: persistentSyncStatus.serverStorageRevision,
    serverStorageHash: persistentSyncStatus.serverStorageHash,
    importScreen: undefined
  };

  if (!validateAndLogInitialAppState("loadInitialState", state)) {
    state.userInvalid = true;
    state.modal = { modalType: "invalid-participant" };
  }

  return state;
}

registerServiceWorker();

const root = createRoot(document.querySelector("#root") as Element);
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
