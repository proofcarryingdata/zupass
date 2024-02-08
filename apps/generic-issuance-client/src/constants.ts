export const PCD_GITHUB_URL = "https://github.com/proofcarryingdata/pcd";

export const ZUPASS_URL = process.env.PASSPORT_CLIENT_URL as string;
export const ZUPASS_SERVER_URL = process.env.PASSPORT_SERVER_URL as string;

// 24 hours maximum
export const SESSION_DURATION_MINUTES = 24 * 60;
export const SESSION_DURATION_MS = SESSION_DURATION_MINUTES * 60 * 1000;
