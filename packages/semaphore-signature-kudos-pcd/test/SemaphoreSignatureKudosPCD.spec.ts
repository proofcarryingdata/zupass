/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import "mocha";
import * as path from "path";
import {
  KudosTargetType,
  SemaphoreSignatureKudosPCDArgs,
  SemaphoreSignatureKudosPCDPackage
} from "../src";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("Semaphore Signature Kudos PCD", function () {
  // sets up shared Semaphore args across test cases
  let args: SemaphoreSignatureKudosPCDArgs;
  this.beforeAll(async function () {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await SemaphoreSignaturePCDPackage.init!({
      zkeyFilePath,
      wasmFilePath
    });

    const identity = new Identity();
    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identity })
    );

    args = {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: identityPCD
      },
      data: {
        argumentType: ArgumentTypeName.Object,
        value: {
          watermark: "watermark",
          target: {
            type: KudosTargetType.User,
            user: {
              semaphoreID: identity.commitment.toString()
            }
          }
        }
      }
    };
  });

  this.beforeAll(async function () {
    await SemaphoreSignatureKudosPCDPackage.init!({});
    await SemaphoreSignaturePCDPackage.init!({
      zkeyFilePath,
      wasmFilePath
    });
  });

  it("should be instantiatable", async function () {
    const kudosPCD = await SemaphoreSignatureKudosPCDPackage.prove(args);
    const valid = await SemaphoreSignatureKudosPCDPackage.verify(kudosPCD);

    assert.equal(valid, true);
  });

  it("should serialize and deserialize properly", async function () {
    const kudosPCD = await SemaphoreSignatureKudosPCDPackage.prove(args);

    const serialized =
      await SemaphoreSignatureKudosPCDPackage.serialize(kudosPCD);
    const deserialized = await SemaphoreSignatureKudosPCDPackage.deserialize(
      serialized.pcd
    );

    assert.deepEqual(kudosPCD.claim.toString(), deserialized.claim.toString());
  });
});
