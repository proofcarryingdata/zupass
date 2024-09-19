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

const zapp = {
  name: "test-client",
  permissions: ["read", "write"]
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
