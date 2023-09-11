import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import AddPCD from "./pages/examples/add-pcd";
import GetWithoutProving from "./pages/examples/get-without-proving";
import GroupProof from "./pages/examples/group-proof";
import SignatureProof from "./pages/examples/signature-proof";
import Home from "./pages/Home";
import PCDPassGroupProof from "./pages/pcdpass-examples/group-proof";
import PCDPassSignatureProof from "./pages/pcdpass-examples/signature-proof";
import PCDPassZkEDdSAProof from "./pages/pcdpass-examples/zkeddsa-proof";
import PassportPopupRedirect from "./pages/popup";
import ZuzaluGroupProof from "./pages/zuzalu-examples/group-proof";
import ZuzaluSignIn from "./pages/zuzalu-examples/sign-in";
import ZuzaluSignatureProof from "./pages/zuzalu-examples/signature-proof";
import ZuzaluUuidProof from "./pages/zuzalu-examples/uuid-proof";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "popup", element: <PassportPopupRedirect /> },

  { path: "examples/group-proof", element: <GroupProof /> },
  { path: "examples/signature-proof", element: <SignatureProof /> },
  { path: "examples/get-without-proving", element: <GetWithoutProving /> },
  { path: "examples/add-pcd", element: <AddPCD /> },

  { path: "pcdpass-examples/group-proof", element: <PCDPassGroupProof /> },
  {
    path: "pcdpass-examples/signature-proof",
    element: <PCDPassSignatureProof />
  },
  { path: "pcdpass-examples/zkeddsa-proof", element: <PCDPassZkEDdSAProof /> },

  { path: "zuzalu-examples/group-proof", element: <ZuzaluGroupProof /> },
  { path: "zuzalu-examples/sign-in", element: <ZuzaluSignIn /> },
  {
    path: "zuzalu-examples/signature-proof",
    element: <ZuzaluSignatureProof />
  },
  { path: "zuzalu-examples/uuid-proof", element: <ZuzaluUuidProof /> }
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </React.StrictMode>
);
