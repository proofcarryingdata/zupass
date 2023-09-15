import { FeedRequest, FeedResponse } from "@pcd/passport-interface";

/**
 * Given the information the server knows about the user, it is able to
 * 'issue' some pcds to the user. This function requests the set of PCDs
 * that the server wants to 'issue' to the user.
 */
export async function requestIssuedPCDs(
  providerUrl: string,
  request: FeedRequest
): Promise<FeedResponse | undefined> {
  try {
    const url = providerUrl;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    const issuedPCDResponse = (await response.json()) as FeedResponse;
    return issuedPCDResponse;
  } catch (e) {
    return undefined;
  }
}
