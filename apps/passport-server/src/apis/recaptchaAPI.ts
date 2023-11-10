import { APIResult } from "@pcd/passport-interface";
import { logger } from "../util/logger";
import { instrumentedFetch } from "./fetch";

/**
 * Recaptcha V3 request
 */
export interface RecaptchaV3Request {
  response: string;
}

/**
 * Recaptcha V3 response
 */
export interface RecaptchaV3Response {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
}

/**
 * Recaptcha V3 API response
 */
export type RecaptchaV3APIResponse = APIResult<RecaptchaV3Response, string>;

export interface IRecaptchaAPI {
  send: (args: RecaptchaV3Request) => Promise<RecaptchaV3APIResponse>;
}

export async function verifyRecaptcha({
  response
}: RecaptchaV3Request): Promise<RecaptchaV3APIResponse> {
  if (!process.env.RECAPTCHA_SECRET) {
    return {
      success: false,
      error: "Missing RECAPTCHA_SECRET"
    };
  }

  try {
    const res = await instrumentedFetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET,
          response
        })
      }
    );

    return {
      success: true,
      value: await res.json()
    };
  } catch (e) {
    logger("[FETCH] Error sending recaptcha request", e);
    return {
      success: false,
      error: "Error sending recaptcha request"
    };
  }
}
