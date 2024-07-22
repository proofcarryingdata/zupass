import urljoin from "url-join";
import { DeleteAccountRequest } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to delete the user's account, and all data associated with
 * it.
 */
export async function requestDeleteAccount(
  zupassServerUrl: string,
  req: DeleteAccountRequest
): Promise<DeleteAccountResult> {
  return httpPostSimple(
    urljoin(zupassServerUrl, "/account/delete"),
    async () => ({
      value: undefined,
      success: true
    }),
    req
  );
}

export type DeleteAccountResult = APIResult<unknown>;
