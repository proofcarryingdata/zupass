import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import { loadInitialState } from "../src/loadInitialState";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppRouter } from "../src/router";
import { ZuState } from "../src/state";
import { pollUser } from "../src/user";

class App extends React.Component<object, ZuState> {
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
        {!hasStack && <AppRouter />}
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

registerServiceWorker();

const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
