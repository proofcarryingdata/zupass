import urljoin from "url-join";

export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_STAGING = process.env.NODE_ENV === "staging";
export const ZUPASS_CLIENT_URL_ENV = process.env.ZUPASS_CLIENT_URL_CONSUMER;
export const ZUPASS_SERVER_URL_ENV = process.env.ZUPASS_SERVER_URL_CONSUMER;
export const CONSUMER_SERVER_URL_ENV = process.env.CONSUMER_SERVER_URL;

export const ZUPASS_URL = ZUPASS_CLIENT_URL_ENV
  ? ZUPASS_CLIENT_URL_ENV
  : IS_PROD
  ? "https://zupass.org/"
  : IS_STAGING
  ? "https://staging.zupass.org/"
  : "http://localhost:3000/";

export const ZUPASS_SERVER_URL = ZUPASS_SERVER_URL_ENV
  ? ZUPASS_SERVER_URL_ENV
  : IS_PROD
  ? "https://api.zupass.org/"
  : IS_STAGING
  ? "https://api-staging.zupass.org/"
  : "http://localhost:3002/";

export const EVERYONE_SEMAPHORE_GROUP_URL = ZUPASS_SERVER_URL_ENV
  ? urljoin(ZUPASS_SERVER_URL_ENV, "/semaphore/5")
  : IS_PROD
  ? "https://api.zupass.org/semaphore/5"
  : IS_STAGING
  ? "https://api-staging.zupass.org/semaphore/5"
  : "http://localhost:3002/semaphore/5";

export const CONSUMER_SERVER_URL = CONSUMER_SERVER_URL_ENV
  ? CONSUMER_SERVER_URL_ENV
  : IS_PROD
  ? "https://consumer-server.onrender.com/"
  : IS_STAGING
  ? "https://consumer-server-staging.onrender.com/"
  : "http://localhost:3003/";
