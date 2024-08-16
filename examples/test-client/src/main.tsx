import { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import { Feeds } from "./apis/Feeds";
import { FileSystem } from "./apis/FileSystem";
import { GPC } from "./apis/GPC";
import { Identity } from "./apis/Identity";
import { Navbar } from "./components/Navbar";
import {
  EmbeddedZupassProvider,
  useEmbeddedZupass
} from "./hooks/useEmbeddedZupass";

export const ZUPASS_URL =
  process.env.ZUPASS_URL || "https://staging-rob.zupass.org";

const zapp = {
  name: "test-client",
  permissions: ["read", "write"]
};

export default function Main(): ReactNode {
  const { connected } = useEmbeddedZupass();
  return (
    <>
      <Navbar connecting={!connected} />
      <div className="container mx-auto my-4 p-4">
        <p>You can use this page to test the embedded Zupass API.</p>
        <div className="flex flex-col gap-4 my-4">
          <FileSystem />
          <GPC />
          <Feeds />
          <Identity />
        </div>
      </div>
    </>
  );
}

function App(): ReactNode {
  const zupassUrl = localStorage.getItem("zupassUrl") || ZUPASS_URL;

  return (
    <EmbeddedZupassProvider zapp={zapp} zupassUrl={zupassUrl}>
      <Main />
    </EmbeddedZupassProvider>
  );
}
const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
