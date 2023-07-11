import { IssuedPCDsRequest, IssuedPCDsResponse } from "@pcd/passport-interface";
import { appConfig } from "../appConfig";

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
    const pendingPCD = (await response.json()) as IssuedPCDsResponse;
    return pendingPCD;
  } catch (e) {
    return undefined;
  }
}
