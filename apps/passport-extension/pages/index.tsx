import { mountApplication } from "@pcd/passport-client-ui/pages/index";

mountApplication(document.querySelector("#root"), {
  devMode: process.env.NODE_ENV !== "production",
  passportServer: process.env.PASSPORT_SERVER_URL,
  maxProofAge: 1000 * 60 * 60 * 4,
  rollbarToken: process.env.ROLLBAR_TOKEN,
});
