import urlJoin from "url-join";
import { PretixSyncStatusResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server whether its Devconnect or Zuzalu pretix sync
 * services have completed at least one sync since server startup.
 */
export async function requestPretixSyncStatus(
  zupassServerUrl: string,
  isZuzalu: boolean
): Promise<PretixSyncStatusResult> {
  return httpGetSimple(
    isZuzalu
      ? urlJoin(zupassServerUrl, `/pretix/status`)
      : urlJoin(zupassServerUrl, `/devconnect-pretix/status`),
    async (resText) => ({ value: resText, success: true })
  );
}

export type PretixSyncStatusResult = APIResult<PretixSyncStatusResponseValue>;
