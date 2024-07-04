import { RollbarProvider } from "@pcd/client-shared";
import {
  CredentialManager,
  ZUPASS_CREDENTIAL_REQUEST,
  requestOfflineTickets,
  requestOfflineTicketsCheckin
} from "@pcd/passport-interface";
import {
  getErrorMessage,
  isLocalStorageAvailable,
  isWebAssemblySupported
} from "@pcd/util";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "react-hot-toast";
import { HashRouter, Route, Routes } from "react-router-dom";
import {
  Button,
  H1,
  Spacer,
  SupportLink,
  TextCenter
} from "../components/core";
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
import { LocalStorageNotAccessibleScreen } from "../components/screens/LocalStorageNotAccessibleScreen";
import { AlreadyRegisteredScreen } from "../components/screens/LoginScreens/AlreadyRegisteredScreen";
import { CreatePasswordScreen } from "../components/screens/LoginScreens/CreatePasswordScreen";
import { LoginInterstitialScreen } from "../components/screens/LoginScreens/LoginInterstitialScreen";
import { LoginScreen } from "../components/screens/LoginScreens/LoginScreen";
import { NewPassportScreen } from "../components/screens/LoginScreens/NewPassportScreen";
import { OneClickLoginScreen } from "../components/screens/LoginScreens/OneClickLoginScreen";
import { PrivacyNoticeScreen } from "../components/screens/LoginScreens/PrivacyNoticeScreen";
import { SyncExistingScreen } from "../components/screens/LoginScreens/SyncExistingScreen";
import MPCScreen from "../components/screens/MPCScreen";
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
import {
  AppContainer,
  Background,
  CenterColumn,
  GlobalBackground
} from "../components/shared/AppContainer";
import { useTsParticles } from "../components/shared/useTsParticles";
import { appConfig } from "../src/appConfig";
import { useStateContext } from "../src/appHooks";
import {
  closeBroadcastChannel,
  setupBroadcastChannel
} from "../src/broadcastChannel";
import { Action, StateContext, dispatch } from "../src/dispatch";
import { Emitter } from "../src/emitter";
import { loadInitialState } from "../src/loadInitialState";
import {
  saveCheckedInOfflineTickets,
  saveOfflineTickets,
  saveUsingLaserScanner
} from "../src/localstorage";
import init, {
  state0_bindgen,
  state1_bindgen,
  state2_bindgen,
  state3_bindgen,
  state4_bindgen
} from "../src/mp-psi";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppState, StateEmitter } from "../src/state";
import { pollUser } from "../src/user";

function useBackgroundJobs(): void {
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

    const startJobSyncOfflineCheckins = async (): Promise<void> => {
      await jobSyncOfflineCheckins();
      setInterval(jobSyncOfflineCheckins, 1000 * 60);
    };

    const jobSyncOfflineCheckins = async (): Promise<void> => {
      const state = getState();
      if (!state.self || state.offline) {
        return;
      }

      const credentialManager = new CredentialManager(
        getState().identity,
        getState().pcds,
        getState().credentialCache
      );

      if (state.checkedinOfflineDevconnectTickets.length > 0) {
        const checkinOfflineTicketsResult = await requestOfflineTicketsCheckin(
          appConfig.zupassServer,
          {
            checkedOfflineInDevconnectTicketIDs:
              state.checkedinOfflineDevconnectTickets.map((t) => t.id),
            checkerProof: await credentialManager.requestCredential(
              ZUPASS_CREDENTIAL_REQUEST
            )
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
          checkerProof: await credentialManager.requestCredential(
            ZUPASS_CREDENTIAL_REQUEST
          )
        }
      );

      if (offlineTicketsResult.success) {
        update({
          offlineTickets: offlineTicketsResult.value.offlineTickets
        });
        saveOfflineTickets(offlineTicketsResult.value.offlineTickets);
      }
    };

    const startBackgroundJobs = (): void => {
      console.log("[JOB] Starting background jobs...");
      document.addEventListener("visibilitychange", () => {
        setupPolling();
      });
      setupPolling();
      startJobSyncOfflineCheckins();
      jobCheckConnectivity();
    };

    setupBroadcastChannel(dispatch);
    setupUsingLaserScanning();
    startBackgroundJobs();
    dispatch({ type: "initialize-strich" });

    return () => {
      closeBroadcastChannel();
    };
  });
}

function App(): JSX.Element {
  useBackgroundJobs();
  const state = useStateContext().getState();

  const hasStack = !!state.error?.stack;
  return (
    <>
      {!isWebAssemblySupported() ? (
        <HashRouter>
          <Routes>
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="*" element={<NoWASMScreen />} />
          </Routes>
        </HashRouter>
      ) : !isLocalStorageAvailable() ? (
        <HashRouter>
          <Routes>
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="*" element={<LocalStorageNotAccessibleScreen />} />
          </Routes>
        </HashRouter>
      ) : !hasStack ? (
        <Router />
      ) : (
        <HashRouter>
          <Routes>
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="*" element={<AppContainer bg="gray" />} />
          </Routes>
        </HashRouter>
      )}
    </>
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
          <Route path="mpc" element={<MPCScreen />} />
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
            path="one-click-login/:email/:code/:targetFolder"
            element={<OneClickLoginScreen />}
          />
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

interface AppStateProviderProps {
  children: React.ReactNode;
  initialState: AppState;
}

const stateEmitter: StateEmitter = new Emitter();

const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  initialState
}) => {
  const [state, setState] = useState<AppState>(initialState);
  const [lastDiff, setLastDiff] = useState<Partial<AppState>>({});

  const update = useCallback(
    (diff: Partial<AppState>): void => {
      setState(Object.assign(state, diff));

      // In a React class component, the `setState` method has a second
      // parameter, which is a callback function that React will invoke when
      // the state change has taken effect. `useState` does not offer the same
      // functionality, and the recommended approach is to use a `useEffect`
      // hook with the relevant piece of state as a dependency. The effect hook
      // will then be invoked whenever the state changes.
      //
      // However, we specifically want to observe changes to the `state`
      // variable, and the use of `Object.assign` above ensures that, from
      // React's perspective, the object doesn't change, at least not in a way
      // that would trigger a re-render or an effect hook to run. This is
      // because we do not change the object's identity, only its content.
      //
      // So, we need to set up some other piece of state that changes whenever
      // the state object does. Here, we track the receipt of diffs in the
      // update method, and in the below `useEffect` hook we trigger the hook
      // to fire whenever a new diff is received. This allows the hook to fire
      // on state changes even though it can't track a change to the state
      // object directly. It will then emit an event, which is what the rest of
      // the app uses to work around the fact that it also can't track changes
      // to the state object.
      setLastDiff(diff);
    },
    [state]
  );

  useEffect(() => {
    stateEmitter.emit(state);
  }, [state, lastDiff]);

  useEffect(() => {
    function isEqual(a: Uint32Array, b: Uint32Array): boolean {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }

    init().then(() => {
      const state0 = state0_bindgen();
      const bit_vector_a = new Uint32Array([0, 1, 0, 0, 1, 0, 1, 0, 1, 1]);
      const state1 = state1_bindgen(state0.message_a_to_b, bit_vector_a);
      const bit_vector_b = new Uint32Array([1, 1, 1, 1, 1, 0, 1, 0, 0, 0]);
      // On A's side
      const state2 = state2_bindgen(
        state0.private_output_a,
        state0.public_output_a,
        state1.message_b_to_a,
        bit_vector_b
      );
      // On B's side
      const state3 = state3_bindgen(
        state1.private_output_b,
        state1.public_output_b,
        state2.message_a_to_b
      );
      const _psi_output_a = state4_bindgen(
        state2.public_output_a,
        state3.message_b_to_a
      );
      const _psi_output_b = state3.psi_output;
      // console.log(
      //   `psi output ${
      //     isEqual(psi_output_a, psi_output_b) ? "succeeded" : "failed"
      //   }`
      // );
      // console.log({ psi_output_a, psi_output_b, state1, state2, state3 });
    });
  }, []);

  const actionDispatch = useCallback(
    (action: Action): Promise<void> => {
      return dispatch(action, state, update);
    },
    [state, update]
  );

  const context = useMemo(
    () => ({
      getState: () => state,
      update,
      dispatch: actionDispatch,
      stateEmitter
    }),
    [actionDispatch, state, update]
  );

  return (
    <StateContext.Provider value={context}>{children}</StateContext.Provider>
  );
};

registerServiceWorker();

loadInitialState()
  .then((initialState: AppState) => {
    const root = createRoot(document.querySelector("#root") as Element);
    root.render(
      <RollbarProvider
        config={{
          accessToken: appConfig.rollbarToken,
          environmentName: appConfig.rollbarEnvName
        }}
      >
        <AppStateProvider initialState={initialState}>
          <App />
        </AppStateProvider>
      </RollbarProvider>
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    const root = createRoot(document.querySelector("#root") as Element);
    root.render(
      <RollbarProvider
        config={{
          accessToken: appConfig.rollbarToken,
          environmentName: appConfig.rollbarEnvName
        }}
      >
        <GlobalBackground color={"var(--bg-dark-primary)"} />
        <Background>
          <CenterColumn>
            <TextCenter>
              <Spacer h={64} />
              <H1>An error occurred when loading Zupass</H1>
              <Spacer h={24} />
              Error: {getErrorMessage(error)}
              <Spacer h={24} />
              For support, please send a message to <SupportLink />.
              <Spacer h={24} />
              <Button onClick={() => window.location.reload()}>
                Reload Zupass
              </Button>
              <Spacer h={24} />
            </TextCenter>
            <div></div>
          </CenterColumn>
        </Background>
      </RollbarProvider>
    );
  });
