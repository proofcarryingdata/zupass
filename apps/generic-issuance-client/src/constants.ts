export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const IS_PROD = process.env.NODE_ENV === "production";

export const ZUPASS_URL = process.env.PASSPORT_CLIENT_URL as string;
export const ZUPASS_SERVER_URL = process.env.PASSPORT_SERVER_URL as string;

// One hour timeout in production; one week timeout in other environments
export const SESSION_DURATION_MINUTES = IS_PROD ? 24 * 60 : 24 * 60 * 7;
export const SESSION_DURATION_MS = SESSION_DURATION_MINUTES * 60 * 1000;
