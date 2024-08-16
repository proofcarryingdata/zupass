import { ChakraProvider } from "@chakra-ui/react";
import { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import { FrogCrypto } from "./apis/FrogCrypto";
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
      <ChakraProvider>
        <Navbar connecting={!connected} />
        <div className="container mx-auto my-4 p-4">
          <div className="flex flex-col gap-4 my-4">
            <FrogCrypto />
            {/* <FileSystem />
          <GPC /> */}
          </div>
        </div>
      </ChakraProvider>
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
