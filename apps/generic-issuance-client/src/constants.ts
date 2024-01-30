export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_STAGING = process.env.NODE_ENV === "staging";

export const ZUPASS_URL = IS_PROD
  ? "https://zupass.org/"
  : IS_STAGING
  ? "https://staging.zupass.org/"
  : "http://localhost:3000/";

export const ZUPASS_SERVER_URL = IS_PROD
  ? "https://api.zupass.org/"
  : IS_STAGING
  ? "https://api-staging.zupass.org/"
  : "http://localhost:3002/";
