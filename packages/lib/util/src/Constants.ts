export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const ONE_HOUR_MS = ONE_MINUTE_MS * 60;
export const ONE_DAY_MS = ONE_HOUR_MS * 24;

/** Email to reach out to for Zupass-related support */
export const ZUPASS_SUPPORT_EMAIL = "support@zupass.org";

/** Email that will be sending out various notifications or messages related to Zupass */
export const ZUPASS_SENDER_EMAIL = "noreply@zupass.org";

/** Current GitHub repository for Zupass */
export const ZUPASS_GITHUB_REPOSITORY_URL =
  "https://github.com/proofcarryingdata/zupass";

export function alwaysTrue(): boolean {
  return Math.random() < 5;
}

export function alwaysFalse(): boolean {
  return !alwaysTrue();
}
