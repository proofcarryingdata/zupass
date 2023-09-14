import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { AddSubscriptionScreen } from "../components/screens/AddSubscriptionScreen";
import { AlreadyRegisteredScreen } from "../components/screens/AlreadyRegisteredScreen";
import { CreatePasswordScreen } from "../components/screens/CreatePasswordScreen";
import { DevconnectCheckinScreen } from "../components/screens/DevconnectCheckinScreen";
import { DeviceLoginScreen } from "../components/screens/DeviceLoginScreen";
import { EnterConfirmationCodeScreen } from "../components/screens/EnterConfirmationCodeScreen";
import { GetWithoutProvingScreen } from "../components/screens/GetWithoutProvingScreen";
import { HaloScreen } from "../components/screens/HaloScreen/HaloScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
import { LoginInterstitialScreen } from "../components/screens/LoginInterstitialScreen";
import { LoginScreen } from "../components/screens/LoginScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NewPassportScreen } from "../components/screens/NewPassportScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { SubscriptionsScreen } from "../components/screens/SubscriptionsScreen";
import { SyncExistingScreen } from "../components/screens/SyncExistingScreen";
import { VerifyScreen } from "../components/screens/VerifyScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { appConfig } from "../src/appConfig";
import { addDefaultSubscriptions } from "../src/defaultSubscriptions";
import {
  Action,
  dispatch,
  StateContext,
  StateContextState
} from "../src/dispatch";
import { Emitter } from "../src/emitter";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadSelf,
  loadSubscriptions,
  loadUserInvalid,
  saveIdentity,
  saveSubscriptions
} from "../src/localstorage";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppState, StateEmitter } from "../src/state";
import { pollUser } from "../src/user";

class App extends React.Component<object, AppState> {
  state = undefined as AppState | undefined;
  stateEmitter: StateEmitter = new Emitter();
  update = (diff: Pick<AppState, keyof AppState>) => {
    this.setState(diff, () => {
      this.stateEmitter.emit(this.state);
    });
  };
  dispatch = (action: Action) => dispatch(action, this.state, this.update);
  componentDidMount() {
    loadInitialState().then((s) => this.setState(s, this.startBackgroundJobs));
  }
  stateContextState: StateContextState = {
    getState: () => this.state,
    stateEmitter: this.stateEmitter,
    dispatch: this.dispatch
  };

  render() {
    const { state } = this;

    if (!state) {
      return null;
    }

    const hasStack = state.error?.stack != null;
    return (
      <StateContext.Provider value={this.stateContextState}>
        {!hasStack && <Router />}
        {hasStack && (
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
    console.log("Starting background jobs...");
    this.jobPollUser();
  };

  jobPollUser = async () => {
    console.log("[JOB] polling user");

    try {
      if (this.state?.self) {
        await pollUser(this.state.self, this.dispatch);
      }
    } catch (e) {
      console.log("[JOB] failed poll user");
      console.log(e);
    }

    setTimeout(this.jobPollUser, 1000 * 60 * 5);
  };
}

const Router = React.memo(RouterImpl);

function RouterImpl() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/">
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
          {!appConfig.isZuzalu && (
            <Route path="create-password" element={<CreatePasswordScreen />} />
          )}
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
          {appConfig.isZuzalu && (
            <Route path="sync-existing" element={<SyncExistingScreen />} />
          )}
          <Route
            path="verify"
            element={
              appConfig.isZuzalu ? (
                <VerifyScreen />
              ) : (
                <DevconnectCheckinScreen />
              )
            }
          />
          <Route path="device-login" element={<DeviceLoginScreen />} />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="add-subscription" element={<AddSubscriptionScreen />} />
          <Route path="*" element={<MissingScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

async function loadInitialState(): Promise<AppState> {
  let identity = loadIdentity();
  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const userInvalid = loadUserInvalid();
  const subscriptions = await loadSubscriptions();

  subscriptions.updatedEmitter.listen(() => saveSubscriptions(subscriptions));

  if (self) {
    await addDefaultSubscriptions(identity, subscriptions);
  }

  let modal = "" as AppState["modal"];

  if (userInvalid) {
    modal = "invalid-participant";
  } else if (
    // If on Zupass legacy login, ask user to save their Sync Key
    appConfig.isZuzalu &&
    self != null &&
    !localStorage["savedSyncKey"]
  ) {
    console.log("Asking existing user to save their Sync Key...");
    modal = "save-sync";
  }

  return {
    self,
    encryptionKey,
    pcds,
    identity,
    modal,
    userInvalid: userInvalid,
    subscriptions
  };
}

registerServiceWorker();

const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
