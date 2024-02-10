import { ChakraProvider } from "@chakra-ui/react";
import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React, { ReactNode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import { RefreshSession } from "./components/RefreshSession";
import { GIContext, GIContextState } from "./helpers/Context";
import { NotFound } from "./pages/404";
import CreatePipeline from "./pages/CreatePipeline";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Pipeline from "./pages/Pipeline";

const stytch = new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN as string);

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/create-pipeline", element: <CreatePipeline /> },
  { path: "/pipelines/:id", element: <Pipeline /> },
  { path: "*", element: <NotFound /> }
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
    <React.StrictMode>
      <ChakraProvider>
        <StytchProvider stytch={stytch}>
          <GIContext.Provider value={state}>
            <RefreshSession />
            <GlobalStyle />
            <RouterProvider router={router} />
          </GIContext.Provider>
        </StytchProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
