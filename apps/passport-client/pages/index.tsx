import {
  createStorageBackedCredentialCache,
  requestOfflineTickets,
  requestOfflineTicketsCheckin
} from "@pcd/passport-interface";
import { isWebAssemblySupported } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { toast } from "react-hot-toast";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { AddSubscriptionScreen } from "../components/screens/AddSubscriptionScreen";
import { ChangePasswordScreen } from "../components/screens/ChangePasswordScreen";
import { DevconnectCheckinByIdScreen } from "../components/screens/DevconnectCheckinByIdScreen";
import { EnterConfirmationCodeScreen } from "../components/screens/EnterConfirmationCodeScreen";
import { FrogManagerScreen } from "../components/screens/FrogScreens/FrogManagerScreen";
import { FrogSubscriptionScreen } from "../components/screens/FrogScreens/FrogSubscriptionScreen";
import { GetWithoutProvingScreen } from "../components/screens/GetWithoutProvingScreen";
import { HaloScreen } from "../components/screens/HaloScreen/HaloScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
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
import { SecondPartyTicketVerifyScreen } from "../components/screens/SecondPartyTicketVerifyScreen";
import { SubscriptionsScreen } from "../components/screens/SubscriptionsScreen";
import { TermsScreen } from "../components/screens/TermsScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
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
  saveSubscriptions,
  saveUsingLaserScanner
} from "../src/localstorage";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppState, StateEmitter } from "../src/state";
import { pollUser } from "../src/user";

class App extends React.Component<object, AppState> {
  state = undefined as AppState | undefined;
  readonly BG_POLL_INTERVAL_MS = 1000 * 60;
  lastBackgroundPoll = 0;
  activePollTimout: NodeJS.Timeout | undefined = undefined;

  stateEmitter: StateEmitter = new Emitter();
  update = (diff: Pick<AppState, keyof AppState>) => {
    this.setState(diff, () => {
      this.stateEmitter.emit(this.state);
    });
  };

  dispatch = (action: Action) => dispatch(action, this.state, this.update);
  componentDidMount() {
    loadInitialState().then((s) => this.setState(s, this.startBackgroundJobs));
    setupBroadcastChannel(this.dispatch);
    setupUsingLaserScanning();
  }
  componentWillUnmount(): void {
    closeBroadcastChannel();
  }
  stateContextState: StateContextValue = {
    getState: () => this.state,
    stateEmitter: this.stateEmitter,
    dispatch: this.dispatch,
    update: this.update
  };

  render() {
    const { state } = this;

    if (!state) {
      return null;
    }

    const hasStack = state.error?.stack != null;
    return (
      <StateContext.Provider value={this.stateContextState}>
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

  // Create a React error boundary
  static getDerivedStateFromError(error: Error) {
    console.log("App caught error", error);
    const { message, stack } = error;
    let shortStack = stack.substring(0, 280);
    if (shortStack.length < stack.length) shortStack += "...";
    return {
      error: { title: "Error", message, stack: shortStack }
    } as Partial<AppState>;
  }

  startBackgroundJobs = () => {
    console.log("[JOB] Starting background jobs...");
    document.addEventListener("visibilitychange", () => {
      this.setupPolling();
    });
    this.setupPolling();
    this.startJobSyncOfflineCheckins();
    this.jobCheckConnectivity();
    this.generateCheckinCredential();
  };

  generateCheckinCredential = async () => {
    // This ensures that the check-in credential is pre-cached before the
    // first check-in attempt.
    try {
      await getOrGenerateCheckinCredential(this.state.identity);
    } catch (e) {
      console.log("Could not get or generate checkin credential:", e);
    }
  };

  jobCheckConnectivity = async () => {
    window.addEventListener("offline", () => this.setIsOffline(true));
    window.addEventListener("online", () => this.setIsOffline(false));
  };

  setIsOffline(offline: boolean) {
    console.log(`[CONNECTIVITY] ${offline ? "offline" : "online"}`);
    this.update({
      ...this.state,
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
  }

  /**
   * Idempotently enables or disables periodic polling of jobPollServerUpdates,
   * based on whether the window is visible or invisible.
   *
   * If there is an existing poll scheduled, it will not be rescheduled,
   * but may be cancelled.  If there is no poll scheduled, a new one may be
   * scheduled.  It may happen immediately after the window becomes visible,
   * but never less than than BG_POLL_INTERVAL_MS after the previous poll.
   */
  setupPolling = async () => {
    if (!document.hidden) {
      if (!this.activePollTimout) {
        const nextPollDelay = Math.max(
          0,
          this.lastBackgroundPoll + this.BG_POLL_INTERVAL_MS - Date.now()
        );
        this.activePollTimout = setTimeout(
          this.jobPollServerUpdates,
          nextPollDelay
        );
        console.log(
          `[JOB] next poll for updates scheduled in ${nextPollDelay}ms`
        );
      }
    } else {
      if (this.activePollTimout) {
        clearTimeout(this.activePollTimout);
        this.activePollTimout = undefined;
        console.log("[JOB] poll for updates disabled");
      }
    }
  };

  /**
   * Periodic job for polling the server.  Is scheduled by setupPolling, and
   * will reschedule itself in the same way.
   */
  jobPollServerUpdates = async () => {
    // Mark that poll has started.
    console.log("[JOB] polling server for updates");
    this.activePollTimout = undefined;
    try {
      // Do the real work of the poll.
      this.doPollServerUpdates();
    } finally {
      // Reschedule next poll.
      this.lastBackgroundPoll = Date.now();
      this.setupPolling();
    }
  };

  doPollServerUpdates = async () => {
    if (
      !this.state?.self ||
      !!this.state.userInvalid ||
      !!this.state.anotherDeviceChangedPassword
    ) {
      console.log("[JOB] skipping poll with invalid user");
      return;
    }

    // Check for updates to User object.
    try {
      await pollUser(this.state.self, this.dispatch);
    } catch (e) {
      console.log("[JOB] failed poll user", e);
    }

    // Trigger extra download from E2EE storage, and extra fetch of
    // subscriptions, but only if the first-time sync had time to complete.
    if (this.state.completedFirstSync) {
      this.update({
        ...this.state,
        extraDownloadRequested: true
        // TODO: evaluate if this made a difference for the disappearing
        // ticket problem we encountered during devconnect coworking space
        // checkin
        // extraSubscriptionFetchRequested: true
      });
    }
  };

  async startJobSyncOfflineCheckins() {
    await this.jobSyncOfflineCheckins();
    setInterval(this.jobSyncOfflineCheckins, 1000 * 60);
  }

  jobSyncOfflineCheckins = async () => {
    if (!this.state.self || this.state.offline) {
      return;
    }

    if (this.state.checkedinOfflineDevconnectTickets.length > 0) {
      const checkinOfflineTicketsResult = await requestOfflineTicketsCheckin(
        appConfig.zupassServer,
        {
          checkedOfflineInDevconnectTicketIDs:
            this.state.checkedinOfflineDevconnectTickets.map((t) => t.id),
          checkerProof: await getOrGenerateCheckinCredential(
            this.state.identity
          )
        }
      );

      if (checkinOfflineTicketsResult.success) {
        this.update({
          ...this.state,
          checkedinOfflineDevconnectTickets: []
        });
        saveCheckedInOfflineTickets(undefined);
      }
    }

    const offlineTicketsResult = await requestOfflineTickets(
      appConfig.zupassServer,
      {
        checkerProof: await getOrGenerateCheckinCredential(this.state.identity)
      }
    );

    if (offlineTicketsResult.success) {
      this.update({
        ...this.state,
        offlineTickets: offlineTicketsResult.value.offlineTickets
      });
      saveOfflineTickets(offlineTicketsResult.value.offlineTickets);
    }
  };
}

const Router = React.memo(RouterImpl);

function RouterImpl() {
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
          <Route
            path="frogscriptions/:feedAlias"
            element={<FrogSubscriptionScreen />}
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
function setupUsingLaserScanning() {
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

  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();
  const offlineTickets = loadOfflineTickets();
  const checkedInOfflineDevconnectTickets =
    loadCheckedInOfflineDevconnectTickets();

  subscriptions.updatedEmitter.listen(() => saveSubscriptions(subscriptions));

  let modal = { modalType: "none" } as AppState["modal"];

  if (
    // If on Zupass legacy login, ask user to set password
    self != null &&
    encryptionKey == null &&
    self.salt == null
  ) {
    console.log("Asking existing user to set a password");
    modal = { modalType: "upgrade-account-modal" };
  }

  const credentialCache = createStorageBackedCredentialCache();

  const persistentSyncStatus = loadPersistentSyncStatus();

  return {
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
    serverStorageHash: persistentSyncStatus.serverStorageHash
  };
}

registerServiceWorker();

const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
