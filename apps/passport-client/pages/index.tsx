import { createRoot } from "react-dom/client";
import { registerServiceWorker } from "../src/registerServiceWorker";
import { App } from "./app";

registerServiceWorker();
const root = createRoot(document.querySelector("#root"));
root.render(<App />);
