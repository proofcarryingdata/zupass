import { PendingStampPCD, ProveRequest } from "@pcd/passport-interface";
import { config } from "../../src/config";

export async function requestStampPCD(
  serverReq: ProveRequest
): Promise<PendingStampPCD> {
  const url = `${config.passportServer}/pcds/prove`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(serverReq),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const pendingStampPCD = (await response.json()) as PendingStampPCD;
  return pendingStampPCD;
}
