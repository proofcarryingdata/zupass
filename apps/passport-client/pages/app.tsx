import * as React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppContainer } from "../components/shared/AppContainer";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { APIContext, IServerAPI } from "../src/api/api";
import { Action, dispatch, DispatchContext } from "../src/dispatch";
import { loadInitialState } from "../src/loadInitialState";
import { AppRouter } from "../src/router";
import { ZuState } from "../src/state";
import { pollUser } from "../src/user";

export interface IAppProps {
  api: IServerAPI;
}

export class App extends React.Component<IAppProps, ZuState> {
  public state = undefined as ZuState | undefined;
  private api: IServerAPI;

  constructor(props: IAppProps) {
    super(props);
    this.api = props.api;
  }

  public render() {
    const { state, dispatch: disp } = this;

    if (!state) {
      return null;
    }

    const hasStack = state.error?.stack != null;
    return (
      <RollbarProvider>
        <APIContext.Provider value={this.api}>
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
        </APIContext.Provider>
      </RollbarProvider>
    );
  }

  private readonly update = (diff: Pick<ZuState, keyof ZuState>) => {
    console.log("App.update", diff);
    this.setState(diff);
  };

  private readonly dispatch = (action: Action) =>
    dispatch(action, this.state, this.api, this.update);

  public componentDidMount() {
    loadInitialState().then((s) => this.setState(s, this.startBackgroundJobs));
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
        await pollUser(this.state.self, this.api, this.dispatch);
      }
    } catch (e) {
      console.log("[JOB] failed poll user");
      console.log(e);
    }

    setTimeout(this.jobPollUser, 1000 * 60 * 5);
  };
}
