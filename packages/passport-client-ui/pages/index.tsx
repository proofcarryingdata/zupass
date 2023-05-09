import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { GetWithoutProvingScreen } from "../components/screens/GetWithoutProvingScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
import { LoginScreen } from "../components/screens/LoginScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NewPassportScreen } from "../components/screens/NewPassportScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { SyncExistingScreen } from "../components/screens/SyncExistingScreen";
import { VerifyScreen } from "../components/screens/VerifyScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { Config, setConfig } from "../src/config";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import {
  getSavedSyncKey as loadSavedSyncKey,
  loadEncryptionKey,
  loadIdentity,
  loadParticipantInvalid,
  loadPCDs,
  loadSelf,
  saveIdentity,
} from "../src/localstorage";
import { pollParticipant } from "../src/participant";
import { ZuState } from "../src/state";

export class App extends React.Component<object, ZuState> {
  state = undefined as ZuState | undefined;
  update = (diff: Pick<ZuState, keyof ZuState>) => {
    console.log("App.update", diff);
    this.setState(diff);
  };
  dispatch = (action: Action) => dispatch(action, this.state, this.update);
  componentDidMount() {
    loadInitialState().then((s) => this.setState(s, this.startBackgroundJobs));
  }

  render() {
    const { state, dispatch: disp } = this;

    if (!state) {
      return null;
    }

    const hasStack = state.error?.stack != null;
    return (
      <DispatchContext.Provider value={[state, disp]}>
        {!hasStack && <Router />}
        {hasStack && (
          <HashRouter>
            <Routes>
              <Route path="*" element={<AppContainer bg="gray" />} />
            </Routes>
          </HashRouter>
        )}
      </DispatchContext.Provider>
    );
  }

  // Create a React error boundary
  static getDerivedStateFromError(error: Error) {
    console.log("App caught error", error);
    const { message, stack } = error;
    let shortStack = stack.substring(0, 280);
    if (shortStack.length < stack.length) shortStack += "...";
    return {
      error: { title: "Error", message, stack: shortStack },
    } as Partial<ZuState>;
  }

  startBackgroundJobs = () => {
    console.log("Starting background jobs...");
    this.jobPollParticipant();
  };

  // Poll for participant updates
  jobPollParticipant = async () => {
    console.log("[JOB] polling participant");
    if (this.state?.self) {
      await pollParticipant(this.state.self, this.dispatch);
    }
    setTimeout(this.jobPollParticipant, 1000 * 60 * 5);
  };
}

function Router() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/">
          <Route index element={<HomeScreen />} />
          <Route path="login" element={<LoginScreen />} />
          <Route path="new-passport" element={<NewPassportScreen />} />
          <Route
            path="get-without-proving"
            element={<GetWithoutProvingScreen />}
          />
          <Route path="add" element={<AddScreen />} />
          <Route path="prove" element={<ProveScreen />} />
          <Route path="scan" element={<ScanScreen />} />
          <Route path="sync-existing" element={<SyncExistingScreen />} />
          <Route path="verify" element={<VerifyScreen />} />
          <Route path="*" element={<MissingScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

async function loadInitialState(): Promise<ZuState> {
  let identity = await loadIdentity();
  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = await loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const participantInvalid = await loadParticipantInvalid();
  const savedSyncKey = await loadSavedSyncKey();

  let modal = "" as ZuState["modal"];

  if (participantInvalid) {
    modal = "invalid-participant";
  } else if (self != null && !savedSyncKey) {
    console.log("Asking existing user to save their sync key...");
    modal = "save-sync";
  }

  return {
    self,
    encryptionKey,
    pcds,
    identity,
    modal,
    participantInvalid,
  };
}

export function mountApplication(element: HTMLElement, config: Config) {
  setConfig(config);

  const root = createRoot(element);

  root.render(
    <RollbarProvider>
      <App />
    </RollbarProvider>
  );
}
