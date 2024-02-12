import { ChakraProvider, ColorModeScript, extendTheme } from "@chakra-ui/react";
import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React, { ReactNode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import { PodboxErrorBoundary } from "./components/PodboxErrorBoundary";
import { RefreshSession } from "./components/RefreshSession";
import { RollbarProvider } from "./components/RollbarProvider";
import { GIContext, GIContextState } from "./helpers/Context";
import { NotFound } from "./pages/404";
import Home from "./pages/Home";
import CreatePipelinePage from "./pages/create-pipeline/CreatePipelinePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PipelinePage from "./pages/pipeline/PipelinePage";

window.localStorage.setItem("chakra-ui-color-theme", "dark");
const THEME = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false
  }
});

const stytch = new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN as string);

const router = createHashRouter([
  { path: "/", element: <Home />, ErrorBoundary: PodboxErrorBoundary },
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
            <ChakraProvider>
              <StytchProvider stytch={stytch}>
                <GIContext.Provider value={state}>
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
