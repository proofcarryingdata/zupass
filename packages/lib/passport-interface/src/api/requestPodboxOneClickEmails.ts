import urljoin from "url-join";
import { OneClickEmailResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Hits an endpoint to download anonymized email to pretix order code mappings.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPodboxOneClickEmails(
  podboxServerUrl: string,
  pipelineId: string,
  apiKey: string
): Promise<OneClickEmailResponse> {
  return httpGetSimple(
    urljoin(
      podboxServerUrl,
      "/generic-issuance/api/one-click-emails/",
      pipelineId,
      apiKey
    ),
    async (resText) => ({
      value: JSON.parse(resText) as OneClickEmailResponseValue,
      success: true
    })
  );
}

export type OneClickEmailResponse = APIResult<OneClickEmailResponseValue>;
