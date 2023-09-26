import { requestIssuanceServiceEnabled } from "@pcd/passport-interface";
import { expect } from "chai";
import { PCDpass } from "../../src/types";

export async function expectIssuanceServiceToBeRunning(
  application: PCDpass
): Promise<void> {
  const issuanceServiceEnabledResult = await requestIssuanceServiceEnabled(
    application.expressContext.localEndpoint
  );
  expect(issuanceServiceEnabledResult.value).to.eq(true);
  expect(issuanceServiceEnabledResult.error).to.eq(undefined);
  expect(issuanceServiceEnabledResult.success).to.eq(true);
}
