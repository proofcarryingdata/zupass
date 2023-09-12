import { PendingPCD, ProveRequest } from "@pcd/passport-interface";
import { SERVER_URL } from "../config";

export async function requestPendingPCD(
  serverReq: ProveRequest
): Promise<PendingPCD> {
  const url = `${SERVER_URL}/pcds/prove`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(serverReq),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });
  const pendingPCD = (await response.json()) as PendingPCD;
  return pendingPCD;
}
