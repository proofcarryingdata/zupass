import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React, { ReactNode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import { RefreshSession } from "./components/RefreshSession";
import { GIContext, GIContextState } from "./helpers/Context";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Pipeline from "./pages/Pipeline";

const stytch = new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN as string);

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/pipelines/:id", element: <Pipeline /> }
]);

function App(): ReactNode {
  const [state, setState] = useState<GIContextState>({} as GIContextState);
  const update = useCallback((partial: Partial<GIContextState>) => {
    setState((state) => {
      return {
        ...state,
        ...partial
      };
    });
  }, []);
  state.setState = update;

  return (
    <React.StrictMode>
      <StytchProvider stytch={stytch}>
        <GIContext.Provider value={state}>
          <RefreshSession />
          <GlobalStyle />
          <RouterProvider router={router} />
        </GIContext.Provider>
      </StytchProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
