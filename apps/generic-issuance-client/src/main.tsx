import {
  ChakraProvider,
  ColorModeScript,
  extendTheme,
  useColorMode
} from "@chakra-ui/react";
import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
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
import { GIContext, GIContextState } from "./helpers/Context";
import CreatePipelinePage from "./pages/create-pipeline/CreatePipelinePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import { NotFound } from "./pages/pipeline/404";
import Home from "./pages/pipeline/LoginPage";
import PipelinePage from "./pages/pipeline/PipelinePage";

const THEME = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false
  }
});

const stytch = new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN as string);

const router = createHashRouter([
  {
    path: "/",
    element: (
      <PodboxErrorBoundary>
        <Home />
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

function loadInitalState(): Partial<GIContextState> {
  let isAdminMode = undefined;

  try {
    const adminSerializedValue =
      window.localStorage.getItem("setting-admin-mode");

    if (!adminSerializedValue) {
      throw new Error();
    }

    isAdminMode = JSON.parse(adminSerializedValue);
  } catch (e) {
    //
  }

  const initialState: Partial<GIContextState> = {
    isAdminMode
  };

  return initialState;
}

function saveState(state: GIContextState): void {
  window.localStorage.setItem(
    "setting-admin-mode",
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
  const [state, setState] = useState<GIContextState>(
    () => loadInitalState() as GIContextState
  );

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
              <StytchProvider stytch={stytch}>
                <GIContext.Provider value={state}>
                  <InitScripts />
                  <RefreshSession />
                  <GlobalStyle />
                  <RouterProvider router={router} />
                </GIContext.Provider>
              </StytchProvider>
            </ChakraProvider>
          </PodboxErrorBoundary>
        </RollbarProvider>
      </React.StrictMode>
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
