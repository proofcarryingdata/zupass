import { CheckInRequest, CheckInResponse } from "@pcd/passport-interface";
import { appConfig } from "../appConfig";

/**
 * Tries to check the user in.
 */
export async function requestCheckIn(
  request: CheckInRequest
): Promise<CheckInResponse | undefined> {
  try {
    const url = `${appConfig.passportServer}/issue/check-in`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const checkinResponse = (await response.json()) as CheckInResponse;
    return checkinResponse;
  } catch (e) {
    return undefined;
  }
}
