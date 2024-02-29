import {
  ChakraProvider,
  ColorModeScript,
  extendTheme,
  useColorMode
} from "@chakra-ui/react";
import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import validator from "email-validator";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { createRoot } from "react-dom/client";

import { RouterProvider, createHashRouter } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import { PodboxErrorBoundary } from "./components/PodboxErrorBoundary";
import { RefreshSession } from "./components/RefreshSession";
import { RollbarProvider } from "./components/RollbarProvider";
import { IS_PROD, SESSION_DURATION_MINUTES } from "./constants";
import { GIContext, GIContextState } from "./helpers/Context";
import { DEV_JWT_KEY } from "./helpers/userHooks";
import { NotFound } from "./pages/404";
import CreatePipelinePage from "./pages/create-pipeline/CreatePipelinePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LoginPage from "./pages/pipeline/LoginPage";
import PipelinePage from "./pages/pipeline/PipelinePage";

const THEME = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false
  }
});

const stytch = process.env.STYTCH_PUBLIC_TOKEN
  ? new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN)
  : undefined;

if (IS_PROD && !stytch) {
  throw new Error("expected to have stytch in prod");
}

const router = createHashRouter([
  {
    path: "/",
    element: (
      <PodboxErrorBoundary>
        <LoginPage />
      </PodboxErrorBoundary>
    )
  },
  {
    path: "/dashboard",
    element: (
      <PodboxErrorBoundary>
        <DashboardPage />
      </PodboxErrorBoundary>
    )
  },
  {
    path: "/create-pipeline",
    element: (
      <PodboxErrorBoundary>
        <CreatePipelinePage />
      </PodboxErrorBoundary>
    )
  },
  {
    path: "/pipelines/:id",
    element: (
      <PodboxErrorBoundary>
        <PipelinePage />
      </PodboxErrorBoundary>
    )
  },
  {
    path: "*",
    element: (
      <PodboxErrorBoundary>
        <NotFound />
      </PodboxErrorBoundary>
    )
  }
]);

const ADMIN_MODE_KEY = "setting-admin-mode";

function useInitialState(): GIContextState {
  const [devModeAuthToken, setDevModeAuthToken] = useState<string | undefined>(
    !stytch ? window.localStorage.getItem(DEV_JWT_KEY) ?? undefined : undefined
  );

  let isAdminMode = undefined;

  try {
    const adminSerializedValue = window.localStorage.getItem(ADMIN_MODE_KEY);

    if (!adminSerializedValue) {
      throw new Error();
    }

    isAdminMode = JSON.parse(adminSerializedValue);
  } catch (e) {
    //
  }

  const initialState: GIContextState = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setState: () => {},
    isAdminMode,
    devModeAuthToken,
    logout: async () => {
      if (stytch) {
        await stytch.session.revoke();
        window.location.reload();
      } else {
        window.localStorage.removeItem(DEV_JWT_KEY);
        setDevModeAuthToken(undefined);
        window.location.reload();
      }
    },
    handleAuthToken: async (token?: string): Promise<void> => {
      if (!token || token === devModeAuthToken) {
        return;
      }

      if (!stytch) {
        if (validator.validate(token)) {
          window.localStorage.setItem(DEV_JWT_KEY, token);
          setDevModeAuthToken(token);
          window.location.reload();
        } else {
          alert("please use a valid email address");
          window.location.href = "/#/";
          return;
        }
      } else {
        await stytch.magicLinks.authenticate(token, {
          session_duration_minutes: SESSION_DURATION_MINUTES
        });
      }
    }
  };

  return initialState;
}

function saveState(state: GIContextState): void {
  window.localStorage.setItem(
    ADMIN_MODE_KEY,
    JSON.stringify(!!state.isAdminMode)
  );
}

function InitScripts(): ReactNode {
  const hasSetColorMode = useRef(false);
  const hasSetTitle = useRef(false);

  const { setColorMode } = useColorMode();

  useEffect(() => {
    if (!hasSetColorMode.current) {
      hasSetColorMode.current = true;
      setColorMode("dark");
    }
  }, [setColorMode]);

  useEffect(() => {
    if (!hasSetTitle.current) {
      hasSetTitle.current = true;
      if (process.env.PODBOX_TITLE_TAG != null) {
        document.title = `Podbox (${process.env.PODBOX_TITLE_TAG})`;
      }
    }
  }, []);

  return <></>;
}

function App(): ReactNode {
  const initialState = useInitialState();

  const [state, setState] = useState<GIContextState>(initialState);

  state.setState = useCallback((partial: Partial<GIContextState>) => {
    setState((state) => {
      const newState = {
        ...state,
        ...partial
      };
      saveState(newState);
      return newState;
    });
  }, []);

  return (
    <>
      <React.StrictMode>
        <RollbarProvider>
          <PodboxErrorBoundary>
            <ColorModeScript initialColorMode={THEME.config.initialColorMode} />
            <ChakraProvider theme={THEME}>
              {stytch ? (
                <StytchProvider stytch={stytch}>
                  <GIContext.Provider value={state}>
                    <InitScripts />
                    <RefreshSession />
                    <GlobalStyle />
                    <RouterProvider router={router} />
                  </GIContext.Provider>
                </StytchProvider>
              ) : (
                <GIContext.Provider value={state}>
                  <InitScripts />
                  <GlobalStyle />
                  <RouterProvider router={router} />
                </GIContext.Provider>
              )}
            </ChakraProvider>
          </PodboxErrorBoundary>
        </RollbarProvider>
      </React.StrictMode>
    </>
  );
}

const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
