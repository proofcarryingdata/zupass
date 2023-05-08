import { App } from "@pcd/passport-client-ui/pages/index";
import { createRoot } from "react-dom/client";
import { RollbarProvider } from "../components/shared/RollbarProvider";

const root = createRoot(document.querySelector("#root"));
root.render(
  <RollbarProvider>
    <App />
  </RollbarProvider>
);
