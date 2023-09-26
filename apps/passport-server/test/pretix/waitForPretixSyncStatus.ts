import { requestPretixSyncStatus } from "@pcd/passport-interface";
import { expect } from "chai";
import { PretixSyncStatus } from "../../src/services/types";
import { PCDpass } from "../../src/types";
import { sleep } from "../../src/util/util";

export async function waitForPretixSyncStatus(
  application: PCDpass,
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
  application: PCDpass
): Promise<void> {
  const pretixSyncStatus = await waitForPretixSyncStatus(application, true);
  expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  application.services.zuzaluPretixSyncService?.stop();
}

export async function expectDevconnectPretixToHaveSynced(
  application: PCDpass
): Promise<void> {
  const pretixSyncStatus = await waitForPretixSyncStatus(application, false);
  expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  application.services.devconnectPretixSyncService?.stop();
}
