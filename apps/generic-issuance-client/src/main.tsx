import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";

const stytch = new StytchUIClient(
  "public-token-test-d34c6a44-f7a6-43e1-a49c-11bbf2396c47"
);

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> }
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StytchProvider stytch={stytch}>
      <GlobalStyle />
      <RouterProvider router={router} />
    </StytchProvider>
  </React.StrictMode>
);
