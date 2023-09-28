import {
  isSettledPendingPCDStatus,
  ProofStatusRequest,
  ProveOnServerResult,
  requestProveOnServer,
  requestServerProofStatus,
  ServerProofRequest,
  ServerProofStatusResult
} from "@pcd/passport-interface";
import { expect } from "chai";
import { Zupass } from "../../src/types";
import { sleep } from "../../src/util/util";

export async function sendProveRequest(
  application: Zupass,
  proveRequest: ServerProofRequest,
  handler: (r: ProveOnServerResult) => Promise<void>
): Promise<ProveOnServerResult> {
  const res = await requestProveOnServer(
    application.expressContext.localEndpoint,
    proveRequest
  );

  await handler(res);

  return res;
}

export async function sendStatusRequest(
  application: Zupass,
  statusRequest: ProofStatusRequest,
  handler?: (r: ServerProofStatusResult) => Promise<void>
): Promise<ServerProofStatusResult> {
  const proofStatusResult = await requestServerProofStatus(
    application.expressContext.localEndpoint,
    statusRequest
  );

  handler && (await handler(proofStatusResult));

  return proofStatusResult;
}

export async function waitForSettledStatus(
  application: Zupass,
  statusRequest: ProofStatusRequest,
  handler?: (r: ServerProofStatusResult) => Promise<void>
): Promise<ServerProofStatusResult> {
  let statusResult = await sendStatusRequest(application, statusRequest);

  while (
    statusResult.value?.status &&
    !isSettledPendingPCDStatus(statusResult.value?.status)
  ) {
    await sleep(500);
    statusResult = await sendStatusRequest(application, statusRequest);
  }

  await (handler && handler(statusResult));
  return statusResult;
}

export async function submitAndWaitForPendingPCD(
  application: Zupass,
  proveRequest: ServerProofRequest,
  settledResponseHandler: (status: ServerProofStatusResult) => Promise<void>
): Promise<void> {
  const proveResult = await sendProveRequest(
    application,
    proveRequest,
    async (r) => {
      expect(r.value).to.haveOwnProperty("pcdType");
      expect(r.value).to.haveOwnProperty("hash");
      expect(r.value).to.haveOwnProperty("status");
      expect(r.error).to.eq(undefined);
      expect(r.success).to.eq(true);
    }
  );

  if (!proveResult.value) {
    throw new Error("expected to be able to get a proof result");
  }

  const settledStatusResult = await waitForSettledStatus(application, {
    hash: proveResult.value.hash
  });

  expect(settledStatusResult.value).to.haveOwnProperty("status");
  expect(settledStatusResult.success).to.eq(true);
  await settledResponseHandler(settledStatusResult);
}
