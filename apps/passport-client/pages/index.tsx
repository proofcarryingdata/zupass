import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { HomeScreen } from "../components/screens/HomeScreen";
import { LoginScreen } from "../components/screens/LoginScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NewPassportScreen } from "../components/screens/NewPassportScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { SyncExistingScreen } from "../components/screens/SyncExistingScreen";
import { VerifyScreen } from "../components/screens/VerifyScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadSelf,
  saveIdentity,
} from "../src/localstorage";
import { fetchParticipant } from "../src/participant";
import { ZuState } from "../src/state";

class App extends React.Component<{}, ZuState | undefined> {
  state = undefined;
  update = (diff: Pick<ZuState, keyof ZuState>) => this.setState(diff);
  dispatch = (action: Action) => dispatch(action, this.state, this.update);

  componentDidMount() {
    loadInitialState().then(async (s) => {
      if (s?.self) {
        const refreshedParticipant = await fetchParticipant(s.self.uuid);
        console.log("fetched latest participant", refreshedParticipant);
        s.self = refreshedParticipant;
      }

      this.setState(s);
      this.startBackgroundJobs();
    });
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
    setTimeout(() => {
      this.jobPollParticipant();
    }, 5 * 60 * 1000);
  };

  // Poll for participant updates
  jobPollParticipant = async () => {
    console.log("job poll participant");
    if (this.state?.self) {
      const refreshedParticipant = await fetchParticipant(this.state.self.uuid);
      console.log("refreshed participant", refreshedParticipant);
      this.dispatch({
        type: "set-self",
        self: refreshedParticipant,
      });
    } else {
      console.log("no self - skipping participant poll");
    }
    setTimeout(this.jobPollParticipant, 5 * 60 * 1000);
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
  let identity = loadIdentity();
  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();

  const bgColor = self ? "gray" : "primary";

  return { self, encryptionKey, pcds, identity, bgColor };
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
