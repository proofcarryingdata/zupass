import { IS_PROD } from "./util";

export const PASSPORT_SERVER_URL = IS_PROD
  ? "https://api.pcd-passport.com"
  : "http://localhost:3002";
