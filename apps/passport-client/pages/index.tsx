import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppContainer } from "../components/core/AppContainer";
import { IndexScreen } from "../components/IndexScreen";
import { SaveSelfScreen } from "../components/SaveSelfScreen";
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
              <Route index element={<IndexScreen />} />
              <Route path="save-self" element={<SaveSelfScreen />} />
            </Route>
          </Routes>
        </HashRouter>
      </DispatchContext.Provider>
    );
  }
}

function loadInitialState(): ZuState {
  const self = loadSelf();
  return {
    self,
    screen: self ? "home" : "login",
  };
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
