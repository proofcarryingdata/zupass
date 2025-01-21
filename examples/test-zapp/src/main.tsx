import {
  ParcnetClientProvider,
  Toolbar
} from "@parcnet-js/app-connector-react";
import { Zapp } from "@parcnet-js/client-rpc";
import type { ReactNode } from "react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { GPC } from "./apis/GPC";
import { Identity } from "./apis/Identity";
import { PODSection } from "./apis/PODSection";
import "./index.css";

const zapp: Zapp = {
  name: "test-client",
  permissions: {
    REQUEST_PROOF: { collections: ["Apples", "Bananas", "Email"] },
    SIGN_POD: {},
    READ_POD: { collections: ["Apples", "Bananas", "Email"] },
    INSERT_POD: { collections: ["Apples", "Bananas"] },
    DELETE_POD: { collections: ["Bananas"] },
    READ_PUBLIC_IDENTIFIERS: {}
  }
};

export default function Main(): ReactNode {
  const [connectUrl, setConnectUrl] = useState(
    localStorage.getItem("connectUrl") ?? "https://zupass.org"
  );
  return (
    <>
      <div className="container mx-auto my-4 p-4">
        <div className="flex md:items-center gap-4 md:gap-8 flex-col md:flex-row mb-4">
          <Toolbar />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="connectUrl"
                placeholder="Enter URL"
                className="border p-2 rounded text-sm"
                value={connectUrl}
                onChange={(e) => setConnectUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    localStorage.setItem("connectUrl", connectUrl);
                    window.location.reload();
                  }
                }}
              />
              <button
                onClick={() => {
                  localStorage.setItem("connectUrl", connectUrl);
                  window.location.reload();
                }}
                className="bg-blue-500 text-white p-2 rounded text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
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
  const connectUrl = localStorage.getItem("connectUrl") ?? "https://zupass.org";
  return (
    <StrictMode>
      <ParcnetClientProvider zapp={zapp} url={connectUrl}>
        <Main />
      </ParcnetClientProvider>
    </StrictMode>
  );
}
const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
