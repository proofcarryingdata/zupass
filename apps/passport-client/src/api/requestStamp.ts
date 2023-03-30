import { PendingStamp, ProveRequest } from "@pcd/passport-interface";
import { config } from "../../src/config";

export async function requestStamp(
  serverReq: ProveRequest
): Promise<PendingStamp> {
  const url = `${config.passportServer}/pcds/prove`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(serverReq),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const pendingStamp = (await response.json()) as PendingStamp;
  return pendingStamp;
}
