export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_STAGING = process.env.NODE_ENV === "staging";

export const ZUPASS_URL = IS_PROD
  ? "https://zupass.org/"
  : IS_STAGING
  ? "https://staging.zupass.org/"
  : "http://localhost:3000/";

export const PCDPASS_URL = IS_PROD
  ? "https://pcdpass.xyz/"
  : IS_STAGING
  ? "https://staging.pcdpass.xyz/"
  : "http://localhost:3000/";

export const ZUPASS_SERVER_URL = IS_PROD
  ? "https://api.zupass.org/"
  : "http://localhost:3002/";

export const PCDPASS_SERVER_URL = IS_PROD
  ? "https://api.pcdpass.xyz/"
  : "http://localhost:3002/";

export const ZUZALU_SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.zupass.org/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export const PCDPASS_SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcdpass.xyz/semaphore/5"
  : "http://localhost:3002/semaphore/5";
