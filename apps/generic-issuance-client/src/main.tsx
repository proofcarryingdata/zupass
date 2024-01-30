import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";

const stytch = new StytchUIClient(process.env.STYTCH_PUBLIC_TOKEN);

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
