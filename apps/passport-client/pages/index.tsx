import { createRoot } from "react-dom/client";
import { RollbarProvider } from "../components/shared/RollbarProvider";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { App } from "./app";

registerServiceWorker();
const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
