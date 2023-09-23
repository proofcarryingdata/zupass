import { requestPretixSyncStatus } from "@pcd/passport-interface";
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
