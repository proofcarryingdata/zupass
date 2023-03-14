import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { HomeScreen } from "../components/screens/HomeScreen";
import { LoginScreen } from "../components/screens/LoginScreen";
import { MissingScreen } from "../components/screens/MissingScreen";
import { NewPassportScreen } from "../components/screens/NewPassportScreen";
import { ProveScreen } from "../components/screens/ProveScreen";
import { SaveSelfScreen } from "../components/screens/SaveSelfScreen";
import { SettingsScreen } from "../components/screens/SettingsScreen";
import { AppContainer } from "../components/shared/AppContainer";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import { loadSelf } from "../src/participant";
import { ZuState } from "../src/state";

class App extends React.Component<{}, ZuState> {
  state = loadInitialState();
  update = (diff: Pick<ZuState, keyof ZuState>) => this.setState(diff);
  disp = (action: Action) => dispatch(action, this.state, this.update);

  render() {
    const { state, disp } = this;
    console.log("Rendering App", state);

    return (
      <DispatchContext.Provider value={[state, disp]}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppContainer />}>
              <Route index element={<HomeScreen />} />
              <Route path="login" element={<LoginScreen />} />
              <Route path="new-passport" element={<NewPassportScreen />} />
              <Route path="save-self" element={<SaveSelfScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="prove" element={<ProveScreen />} />
              <Route path="*" element={<MissingScreen />} />
            </Route>
          </Routes>
        </HashRouter>
      </DispatchContext.Provider>
    );
  }
}

function loadInitialState(): ZuState {
  const self = loadSelf();
  const identityStr = window.localStorage["identity"];
  const identity = identityStr ? new Identity(identityStr) : undefined;
  return { self, identity };
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
