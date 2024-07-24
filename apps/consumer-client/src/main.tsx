import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import AddPCD from "./pages/examples/add-pcd";
import GetWithoutProving from "./pages/examples/get-without-proving";
import GPCProof from "./pages/examples/gpc-proof";
import GroupProof from "./pages/examples/group-proof";
import MultiZkEDdSAEventTicketProof from "./pages/examples/multi-zk-eddsa-event-ticket-proof";
import SignatureProof from "./pages/examples/signature-proof";
import ZkEDdSAEventTicketProof from "./pages/examples/zk-eddsa-event-ticket-proof";
import ZkEDdSAFrogProof from "./pages/examples/zk-eddsa-frog-proof";
import ZkPODTicketProof from "./pages/examples/zk-pod-ticket-proof";
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
    path: "examples/multi-zk-eddsa-event-ticket-proof",
    element: <MultiZkEDdSAEventTicketProof />
  },
  {
    path: "examples/zk-pod-ticket-proof",
    element: <ZkPODTicketProof />
  },
  {
    path: "examples/zuauth",
    element: <ZuAuth />
  },
  { path: "examples/zk-eddsa-frog-proof", element: <ZkEDdSAFrogProof /> },
  { path: "examples/gpc-proof", element: <GPCProof /> }
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </React.StrictMode>
);
