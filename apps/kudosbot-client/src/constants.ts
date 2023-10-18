export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_STAGING = process.env.NODE_ENV === "staging";
export const IS_LOCAL_HTTPS = true;

export const ZUPASS_URL = IS_PROD
  ? "https://zupass.org/"
  : IS_STAGING
  ? "https://staging.zupass.org/"
  : IS_LOCAL_HTTPS
  ? "https://dev.local:3000"
  : "http://localhost:3000/";

export const KUDOSBOT_SERVER_UPLOAD_URL = IS_PROD
  ? ""
  : IS_STAGING
  ? ""
  : IS_LOCAL_HTTPS
  ? "https://dev.local:3005/upload"
  : "http://localhost:3005/upload";
