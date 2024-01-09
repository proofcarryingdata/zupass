import urlJoin from "url-join";
import { LoadUserError, UserResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGet } from "./makeRequest";

/**
 * Asks the Zupass server for a particular user by their unique id.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestUser(
  zupassServerUrl: string,
  uuid: string
): Promise<RequestUserResult> {
  return httpGet<RequestUserResult>(
    urlJoin(zupassServerUrl, "/account/user", uuid),
    {
      onValue: async (resText) => ({
        value: JSON.parse(resText) as UserResponseValue,
        success: true
      }),
      onError: async (resText, statusCode): Promise<RequestUserResult> =>
        statusCode === 410
          ? { error: { userMissing: true }, success: false }
          : { error: { errorMessage: resText }, success: false }
    }
  );
}

export type RequestUserResult = APIResult<UserResponseValue, LoadUserError>;
