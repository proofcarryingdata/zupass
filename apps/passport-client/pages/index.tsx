import { RollbarProvider } from "@pcd/client-shared";
import {
  getErrorMessage,
  isLocalStorageAvailable,
  isWebAssemblySupported
} from "@pcd/util";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import {
  Button,
  H1,
  Spacer,
  SupportLink,
  TextCenter
} from "../components/core";
import { RippleLoader } from "../components/core/RippleLoader";
import { AddEmailScreen } from "../components/screens/AddEmailScreen";
import { AddScreen } from "../components/screens/AddScreen/AddScreen";
import { AddSubscriptionScreen } from "../components/screens/AddSubscriptionScreen";
import { ChangeEmailScreen } from "../components/screens/ChangeEmailScreen";
import { ChangePasswordScreen } from "../components/screens/ChangePasswordScreen";
import { EmbeddedScreen } from "../components/screens/EmbeddedScreens/EmbeddedScreen";
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
import { MissingScreen } from "../components/screens/MissingScreen";
import { NoWASMScreen } from "../components/screens/NoWASMScreen";
import { ProveScreen } from "../components/screens/ProveScreen/ProveScreen";
import { RemoveEmailScreen } from "../components/screens/RemoveEmailScreen";
import { ScanScreen } from "../components/screens/ScanScreen";
import { PodboxScannedTicketScreen } from "../components/screens/ScannedTicketScreens/PodboxScannedTicketScreen/PodboxScannedTicketScreen";
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
import { useIsDeletingAccount, useStateContext } from "../src/appHooks";
import { useBackgroundJobs } from "../src/backgroundJobs";
import { Action, StateContext, dispatch } from "../src/dispatch";
import { Emitter } from "../src/emitter";
import { loadInitialState } from "../src/loadInitialState";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { AppState, StateEmitter } from "../src/state";

function App(): JSX.Element {
  useBackgroundJobs();
  // useZappServer();
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

  const isDeletingAccount = useIsDeletingAccount();

  if (isDeletingAccount) {
    return (
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H1>ZUPASS</H1>
          <Spacer h={24} />
          Deleting your Account
          <Spacer h={8} />
          <RippleLoader />
        </TextCenter>
      </AppContainer>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/">
          <Route path="terms" element={<TermsScreen />} />
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
          <Route path="privacy-notice" element={<PrivacyNoticeScreen />} />
          <Route path="create-password" element={<CreatePasswordScreen />} />
          <Route path="change-password" element={<ChangePasswordScreen />} />
          <Route path="change-email" element={<ChangeEmailScreen />} />
          <Route path="add-email" element={<AddEmailScreen />} />
          <Route path="remove-email" element={<RemoveEmailScreen />} />
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
          <Route path="embedded" element={<EmbeddedScreen />} />
          <Route path="*" element={<MissingScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
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
