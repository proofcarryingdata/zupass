import urlJoin from "url-join";
import { TicketPreviewResultValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server to fetch the ticket previews for the given email and order code.
 */
export async function requestGenericIssuanceTicketPreviews(
  zupassServerUrl: string,
  email: string,
  orderCode: string,
  pipelineId?: string
): Promise<GenericIssuanceTicketPreviewResponse> {
  return httpGetSimple(
    urlJoin(
      zupassServerUrl,
      `/generic-issuance/api/ticket-previews`,
      encodeURIComponent(email),
      encodeURIComponent(orderCode)
    ) + (pipelineId ? `/${pipelineId}` : ""),
    async (resText) => ({
      value: JSON.parse(resText) as TicketPreviewResultValue,
      success: true
    }),
    {}
  );
}

export type GenericIssuanceTicketPreviewResponse =
  APIResult<TicketPreviewResultValue>;
