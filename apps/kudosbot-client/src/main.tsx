import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import KudosbotProof from "./pages/KudosbotProof";
import ZupassPopupRedirect from "./pages/popup";

const router = createHashRouter([
  { path: "/", element: <KudosbotProof /> },
  { path: "popup", element: <ZupassPopupRedirect /> }
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </React.StrictMode>
);
