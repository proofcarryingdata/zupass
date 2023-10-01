import { requestPretixSyncStatus } from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import { expect } from "chai";
import { PretixSyncStatus } from "../../src/services/types";
import { Zupass } from "../../src/types";

export async function waitForPretixSyncStatus(
  application: Zupass,
  isZuzalu: boolean
): Promise<PretixSyncStatus> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pretixSyncStatusResult = await requestPretixSyncStatus(
      application.expressContext.localEndpoint,
      isZuzalu
    );

    if (
      pretixSyncStatusResult.value === PretixSyncStatus.NoPretix ||
      pretixSyncStatusResult.value === PretixSyncStatus.Synced
    ) {
      return pretixSyncStatusResult.value as PretixSyncStatus;
    }

    await sleep(500);
  }
}

export async function expectZuzaluPretixToHaveSynced(
  application: Zupass
): Promise<void> {
  const pretixSyncStatus = await waitForPretixSyncStatus(application, true);
  expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  application.services.zuzaluPretixSyncService?.stop();
}

export async function expectDevconnectPretixToHaveSynced(
  application: Zupass
): Promise<void> {
  const pretixSyncStatus = await waitForPretixSyncStatus(application, false);
  expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  application.services.devconnectPretixSyncService?.stop();
}
