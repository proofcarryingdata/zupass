import { requestIssuanceServiceEnabled } from "@pcd/passport-interface";
import { expect } from "chai";
import { Zupass } from "../../src/types";

export async function expectIssuanceServiceToBeRunning(
  application: Zupass
): Promise<void> {
  const issuanceServiceEnabledResult = await requestIssuanceServiceEnabled(
    application.expressContext.localEndpoint
  );
  expect(issuanceServiceEnabledResult.value).to.eq(true);
  expect(issuanceServiceEnabledResult.error).to.eq(undefined);
  expect(issuanceServiceEnabledResult.success).to.eq(true);
}
