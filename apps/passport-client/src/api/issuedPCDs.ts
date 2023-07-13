import { IssuedPCDsRequest, IssuedPCDsResponse } from "@pcd/passport-interface";
import { appConfig } from "../appConfig";

/**
 * Given the information the server knows about the user, it is able to
 * 'issue' some pcds to the user. This function requests the set of PCDs
 * that the server wants to 'issue' to the user.
 */
export async function requestIssuedPCDs(
  request: IssuedPCDsRequest
): Promise<IssuedPCDsResponse | undefined> {
  try {
    const url = `${appConfig.passportServer}/issue`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const issuedPCDResponse = (await response.json()) as IssuedPCDsResponse;
    return issuedPCDResponse;
  } catch (e) {
    return undefined;
  }
}
