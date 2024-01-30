import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import Home from "./pages/Home";

const router = createHashRouter([{ path: "/", element: <Home /> }]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </React.StrictMode>
);
