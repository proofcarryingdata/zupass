import chai from "chai";
import { PretixSyncStatus } from "../../src/routing/routes/statusRoutes";
import { PCDPass } from "../../src/types";
import { sleep } from "../../src/util/util";

export async function waitForSync(
  application: PCDPass
): Promise<PretixSyncStatus> {
  const { expressContext } = application;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await chai
      .request(expressContext.app)
      .get("/pretix/status")
      .send();

    if (
      r.text === PretixSyncStatus.NoPretix ||
      r.text === PretixSyncStatus.Synced
    ) {
      return r.text as PretixSyncStatus;
    }

    await sleep(500);
  }
}
