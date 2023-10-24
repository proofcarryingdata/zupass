import { createStorageBackedCredentialCache } from "@pcd/passport-interface";
import { isWebAssemblySupported } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { AddSubscriptionScreen } from "../components/screens/AddSubscriptionScreen";
import { ChangePasswordScreen } from "../components/screens/ChangePasswordScreen";
import { DevconnectCheckinByIdScreen } from "../components/screens/DevconnectCheckinByIdScreen";
import { EnterConfirmationCodeScreen } from "../components/screens/EnterConfirmationCodeScreen";
import { GetWithoutProvingScreen } from "../components/screens/GetWithoutProvingScreen";
import { HaloScreen } from "../components/screens/HaloScreen/HaloScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
import { AlreadyRegisteredScreen } from "../components/screens/LoginScreens/AlreadyRegisteredScreen";
import { CreatePasswordScreen } from "../components/screens/LoginScreens/CreatePasswordScreen";
import { LoginInterstitialScreen } from "../components/screens/LoginScreens/LoginInterstitialScreen";
import { LoginScreen } from "../components/screens/LoginScreens/LoginScreen";
import { NewPassportScreen } from "../components/screens/LoginScreens/NewPassportScreen";
import { SyncExistingScreen } from "../components/screens/LoginScreens/SyncExistingScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NoWASMScreen } from "../components/screens/NoWASMScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { SecondPartyTicketVerifyScreen } from "../components/screens/SecondPartyTicketVerifyScreen";
import { SubscriptionsScreen } from "../components/screens/SubscriptionsScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import {
  closeBroadcastChannel,
  setupBroadcastChannel
} from "../src/broadcastChannel";
import { addDefaultSubscriptions } from "../src/defaultSubscriptions";
import {
  Action,
  StateContext,
  StateContextState,
  dispatch
} from "../src/dispatch";
import { Emitter } from "../src/emitter";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadSelf,
  loadSubscriptions,
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
    setupBroadcastChannel(this.dispatch);
  }
  componentWillUnmount(): void {
    closeBroadcastChannel();
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
        {!isWebAssemblySupported() ? (
          <HashRouter>
            <Routes>
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

    setTimeout(this.jobPollUser, 1000 * 60);
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
          <Route path="sync-existing" element={<SyncExistingScreen />} />
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
  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();

  subscriptions.updatedEmitter.listen(() => saveSubscriptions(subscriptions));

  if (self) {
    await addDefaultSubscriptions(subscriptions);
  }

  let modal = { modalType: "none" } as AppState["modal"];

  if (
    // If on Zupass legacy login, ask user to set passwrod
    self != null &&
    encryptionKey == null &&
    self.salt == null
  ) {
    console.log("Asking existing user to set a password");
    modal = { modalType: "upgrade-account-modal" };
  }

  const credentialCache = createStorageBackedCredentialCache();

  return {
    self,
    encryptionKey,
    pcds,
    identity,
    modal,
    subscriptions,
    resolvingSubscriptionId: undefined,
    credentialCache
  };
}

registerServiceWorker();

const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
