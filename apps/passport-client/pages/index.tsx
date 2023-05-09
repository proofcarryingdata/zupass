import { mountApplication } from "@pcd/passport-client-ui/pages/index";
import { registerServiceWorker } from "../src/registerServiceWorker";

mountApplication(document.querySelector("#root"));

registerServiceWorker();
