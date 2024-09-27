import urlJoin from "url-join";
import { TicketPreviewResultValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceTicketPreviews(
  zupassServerUrl: string,
  email: string,
  orderCode: string
): Promise<GenericIssuanceTicketPreviewResponse> {
  return httpGetSimple(
    urlJoin(
      zupassServerUrl,
      `/generic-issuance/api/ticket-previews`,
      encodeURIComponent(email),
      encodeURIComponent(orderCode)
    ),
    async (resText) => ({
      value: JSON.parse(resText) as TicketPreviewResultValue,
      success: true
    }),
    {}
  );
}

export type GenericIssuanceTicketPreviewResponse =
  APIResult<TicketPreviewResultValue>;
