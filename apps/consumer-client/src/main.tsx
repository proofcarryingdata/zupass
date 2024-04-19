import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import AddPCD from "./pages/examples/add-pcd";
import GetWithoutProving from "./pages/examples/get-without-proving";
import GroupProof from "./pages/examples/group-proof";
import SignatureProof from "./pages/examples/signature-proof";
import ZkEDdSAEventTicketProof from "./pages/examples/zk-eddsa-event-ticket-proof";
import ZkEDdSAFrogProof from "./pages/examples/zk-eddsa-frog-proof";
import ZuAuth from "./pages/examples/zuauth";
import Home from "./pages/Home";
import ZupassPopupRedirect from "./pages/popup";

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "popup", element: <ZupassPopupRedirect /> },

  { path: "examples/group-proof", element: <GroupProof /> },
  { path: "examples/signature-proof", element: <SignatureProof /> },
  { path: "examples/get-without-proving", element: <GetWithoutProving /> },
  { path: "examples/add-pcd", element: <AddPCD /> },
  {
    path: "examples/zk-eddsa-event-ticket-proof",
    element: <ZkEDdSAEventTicketProof />
  },
  {
    path: "examples/zuauth",
    element: <ZuAuth />
  },
  { path: "examples/zk-eddsa-frog-proof", element: <ZkEDdSAFrogProof /> }
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </React.StrictMode>
);
