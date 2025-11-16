import { instrumentedFetch } from "../apis/fetch";
import { logger } from "./logger";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verifies a Cloudflare Turnstile captcha token.
 * @param token The captcha token to verify
 * @param secretKey The Turnstile secret key
 * @returns true if verification succeeds, false otherwise
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string
): Promise<boolean> {
  try {
    const response = await instrumentedFetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token
        })
      }
    );

    if (!response.ok) {
      logger(
        `[CAPTCHA] Turnstile verification request failed with status ${response.status}`
      );
      return false;
    }

    const result: TurnstileVerifyResponse = await response.json();

    if (!result.success) {
      logger(
        `[CAPTCHA] Turnstile verification failed: ${result["error-codes"]?.join(", ") ?? "unknown error"}`
      );
      return false;
    }

    return true;
  } catch (e) {
    logger(`[CAPTCHA] Error verifying Turnstile token:`, e);
    return false;
  }
}

