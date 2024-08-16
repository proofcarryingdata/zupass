import { PCDCollection } from "@pcd/pcd-collection";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreIdentityV4PCDPackage,
  v3tov4Identity
} from "@pcd/semaphore-identity-v4";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import {
  makeAddV4CommitmentRequest,
  verifyAddV4CommitmentRequestPCD
} from "../src/api/requestAddSemaphoreV4Commitment";

describe("V3ToV4Migration", async function () {
  it("test", async function () {
    const v3Id = new SemaphoreIdentityPCD(randomUUID(), {
      identity: new Identity()
    });
    const v4Id = v3tov4Identity(v3Id);
    const pcds = new PCDCollection(
      [SemaphoreIdentityPCDPackage, SemaphoreIdentityV4PCDPackage],
      [v3Id, v4Id]
    );

    const migrationRequest = await makeAddV4CommitmentRequest(pcds);
    const migrationPCD = await SemaphoreSignaturePCDPackage.deserialize(
      migrationRequest.pcd.pcd
    );
    const verified = await verifyAddV4CommitmentRequestPCD(migrationPCD);
    expect(verified).toBe(true);
  });
});
