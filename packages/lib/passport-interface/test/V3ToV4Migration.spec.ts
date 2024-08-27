import { PCDCollection } from "@pcd/pcd-collection";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreIdentityV4PCDPackage,
  v3tov4Identity,
  v4PublicKey
} from "@pcd/semaphore-identity-v4";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import {
  makeAddV4CommitmentRequest,
  verifyAddV4CommitmentRequestPCD
} from "../src/api/requestAddSemaphoreV4Commitment";

const zkeyFilePath: string = path.join(
  __dirname,
  "../../../pcd/semaphore-signature-pcd/artifacts/16.zkey"
);
const wasmFilePath: string = path.join(
  __dirname,
  "../../../pcd/semaphore-signature-pcd/artifacts/16.wasm"
);

describe("V3ToV4Migration", async function () {
  this.beforeAll(async function () {
    await SemaphoreSignaturePCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
    });
  });

  it("V3ToV4Migration", async function () {
    const v3Id = new SemaphoreIdentityPCD(randomUUID(), {
      identity: new Identity()
    });
    const v4Id = v3tov4Identity(v3Id);
    const v4Id2 = v3tov4Identity(v3Id); // check it's deterministic
    expect(v4Id.claim.identity.export()).to.eq(v4Id2.claim.identity.export());

    const pcds = new PCDCollection(
      [SemaphoreIdentityPCDPackage, SemaphoreIdentityV4PCDPackage],
      [v3Id, v4Id]
    );

    const migrationRequest = await makeAddV4CommitmentRequest(pcds);
    const migrationPCD = await SemaphoreSignaturePCDPackage.deserialize(
      migrationRequest.pcd.pcd
    );
    const verified = await verifyAddV4CommitmentRequestPCD(migrationPCD);
    expect(verified).to.deep.eq({
      v3Id: v3Id.claim.identity.commitment.toString(),
      v4Id: v4PublicKey(v4Id.claim.identity)
    });
  });
});
