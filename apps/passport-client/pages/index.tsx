import * as React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { ServerApiContext, WebApi } from "../src/api/api";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import { loadInitialState } from "../src/loadInitialState";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppRouter } from "../src/router";
import { ZuState } from "../src/state";
import { pollUser } from "../src/user";

class App extends React.Component<object, ZuState> {
  public state = undefined as ZuState | undefined;
  private readonly update = (diff: Pick<ZuState, keyof ZuState>) => {
    console.log("App.update", diff);
    this.setState(diff);
  };
  private readonly dispatch = (action: Action) =>
    dispatch(action, this.state, this.update);

  public componentDidMount() {
    loadInitialState().then((s) => this.setState(s, this.startBackgroundJobs));
  }

  public render() {
    const { state, dispatch: disp } = this;

    if (!state) {
      return null;
    }

    const hasStack = state.error?.stack != null;
    return (
      <ServerApiContext.Provider value={WebApi}>
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
      </ServerApiContext.Provider>
    );
  }

  // Create a React error boundary
  public static getDerivedStateFromError(error: Error) {
    console.log("App caught error", error);
    const { message, stack } = error;
    let shortStack = stack.substring(0, 280);
    if (shortStack.length < stack.length) shortStack += "...";
    return {
      error: { title: "Error", message, stack: shortStack },
    } as Partial<ZuState>;
  }

  private readonly startBackgroundJobs = () => {
    console.log("Starting background jobs...");
    this.jobPollUser();
  };

  private readonly jobPollUser = async () => {
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
