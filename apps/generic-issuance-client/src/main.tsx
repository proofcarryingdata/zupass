import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React, { ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
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
  state.setState = setState;

  return (
    <React.StrictMode>
      <StytchProvider stytch={stytch}>
        <GIContext.Provider value={state}>
          <GlobalStyle />
          <RouterProvider router={router} />
        </GIContext.Provider>
      </StytchProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
