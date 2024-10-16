import { Zapp } from "@parcnet-js/client-rpc";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GPC } from "./apis/GPC";
import { Identity } from "./apis/Identity";
import { PODSection } from "./apis/PODSection";
import { Navbar } from "./components/Navbar";
import {
  ParcnetClientProvider,
  useParcnetClient
} from "./hooks/useParcnetClient";
import "./index.css";
import { getConnectionInfo } from "./utils";

const zapp: Zapp = {
  name: "test-client",
  permissions: {
    REQUEST_PROOF: { collections: ["Apples", "Bananas"] },
    SIGN_POD: {},
    READ_POD: { collections: ["Apples", "Bananas"] },
    INSERT_POD: { collections: ["Apples", "Bananas"] },
    DELETE_POD: { collections: ["Bananas"] },
    READ_PUBLIC_IDENTIFIERS: {}
  }
};

export default function Main(): ReactNode {
  const { connected } = useParcnetClient();
  return (
    <>
      <Navbar connecting={!connected} />
      <div className="container mx-auto my-4 p-4">
        <p>Welcome to Parcnet!</p>
        <p>You can use this page to test the Parcnet API.</p>
        <div className="flex flex-col gap-4 my-4">
          <PODSection />
          <GPC />
          <Identity />
        </div>
      </div>
    </>
  );
}

function App(): ReactNode {
  return (
    <StrictMode>
      <ParcnetClientProvider zapp={zapp} connectionInfo={getConnectionInfo()}>
        <Main />
      </ParcnetClientProvider>
    </StrictMode>
  );
}
const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
